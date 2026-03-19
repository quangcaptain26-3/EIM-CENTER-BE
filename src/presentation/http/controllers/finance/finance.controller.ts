import { Request, Response } from "express";
import { buildContainer } from "../../../../bootstrap/container";
import { CreateFeePlanBodySchema, UpdateFeePlanBodySchema } from "../../../../application/finance/dtos/fee-plan.dto";
import { CreateInvoiceBodySchema, UpdateInvoiceStatusBodySchema, ListInvoicesQuerySchema } from "../../../../application/finance/dtos/invoice.dto";
import { CreatePaymentBodySchema } from "../../../../application/finance/dtos/payment.dto";
import { StudentFinanceQuerySchema } from "../../../../application/finance/dtos/student-finance.dto";

/**
 * FinanceController: Xử lý các nghiệp vụ tài chính
 *
 * RBAC:
 *  - ROOT, ACCOUNTANT: read/write
 *  - DIRECTOR, ACADEMIC: read only
 *  - SALES, TEACHER: không có quyền truy cập (forbidden ở middleware RBAC)
 */
export class FinanceController {

  // ==========================================
  // FEE PLANS
  // ==========================================

  /**
   * GET /finance/fee-plans
   * Ví dụ request: GET /api/v1/finance/fee-plans?programId=<uuid>
   * Ví dụ response: { success: true, data: [ { id, name, amount, currency, sessionsPerWeek, ... } ] }
   */
  async listFeePlans(req: Request, res: Response) {
    const programId = req.query.programId ? String(req.query.programId) : undefined;
    const container = buildContainer();
    const data = await container.finance.listFeePlansUseCase.execute(programId);
    return res.json({ success: true, data });
  }

  /**
   * POST /finance/fee-plans
   * Ví dụ body: { "programId": "<uuid>", "name": "STARTERS Standard", "amount": 3500000 }
   */
  async createFeePlan(req: Request, res: Response) {
    const body = CreateFeePlanBodySchema.parse(req.body);
    const container = buildContainer();
    const data = await container.finance.createFeePlanUseCase.execute(body);
    // Audit: thay đổi fee plan ảnh hưởng trực tiếp logic học phí, cần trace.
    await container.system.auditWriter.write(
      req.user?.userId,
      "FINANCE_FEE_PLAN_CREATE",
      "fee_plan",
      data.id,
      {
        programId: data.programId,
        name: data.name,
        amount: data.amount,
        currency: data.currency,
        sessionsPerWeek: data.sessionsPerWeek,
      }
    );
    return res.status(201).json({ success: true, data });
  }

  /**
   * PATCH /finance/fee-plans/:id
   * Ví dụ body: { "amount": 4000000 }
   */
  async updateFeePlan(req: Request, res: Response) {
    const id = String(req.params.id);
    const body = UpdateFeePlanBodySchema.parse(req.body);
    const container = buildContainer();
    // Audit: lấy trước/sau để giải thích thay đổi (log tối thiểu).
    const beforeItem = await container.finance.feePlanRepo.findById(id);
    const data = await container.finance.updateFeePlanUseCase.execute(id, body);
    await container.system.auditWriter.write(
      req.user?.userId,
      "FINANCE_FEE_PLAN_UPDATE",
      "fee_plan",
      id,
      {
        before: beforeItem
          ? {
              name: beforeItem.name,
              amount: beforeItem.amount,
              currency: beforeItem.currency,
              sessionsPerWeek: beforeItem.sessionsPerWeek,
            }
          : null,
        after: {
          name: data.name,
          amount: data.amount,
          currency: data.currency,
          sessionsPerWeek: data.sessionsPerWeek,
        },
      }
    );
    return res.json({ success: true, data });
  }

  /**
   * DELETE /finance/fee-plans/:id
   * Xóa gói học phí (ACCOUNTANT/ROOT có FINANCE_WRITE).
   */
  async deleteFeePlan(req: Request, res: Response) {
    const id = String(req.params.id);
    const container = buildContainer();

    const beforeItem = await container.finance.feePlanRepo.findById(id);
    const data = await container.finance.deleteFeePlanUseCase.execute(id);

    // Audit: xóa fee plan ảnh hưởng trực tiếp cấu hình học phí, cần trace.
    await container.system.auditWriter.write(
      req.user?.userId,
      "FINANCE_FEE_PLAN_DELETE",
      "fee_plan",
      id,
      {
        before: beforeItem
          ? {
              name: beforeItem.name,
              amount: beforeItem.amount,
              currency: beforeItem.currency,
              sessionsPerWeek: beforeItem.sessionsPerWeek,
            }
          : null,
      }
    );

    return res.json({ success: true, data });
  }

  // ==========================================
  // INVOICES
  // ==========================================

  /**
   * GET /finance/invoices
   * Ví dụ: GET /api/v1/finance/invoices?status=ISSUED&limit=10
   */
  async listInvoices(req: Request, res: Response) {
    const query = ListInvoicesQuerySchema.parse(req.query);
    const container = buildContainer();
    const data = await container.finance.listInvoicesUseCase.execute(query);
    return res.json({ success: true, data });
  }

  /**
   * GET /finance/invoices/export
   * Xuất danh sách hóa đơn ra Excel
   */
  async exportInvoices(req: Request, res: Response) {
    const fromDate = req.query.fromDate as unknown as string;
    const toDate = req.query.toDate as unknown as string;
    const status = req.query.status as unknown as string | undefined;
    const enrollmentId = req.query.enrollmentId as unknown as string | undefined;
    const overdue =
      typeof req.query.overdue === "string" ? req.query.overdue.toString() === "true" : undefined;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, error: 'Thiếu tham số fromDate hoặc toDate' });
    }

    const container = buildContainer();
    // Audit: export tài chính là hành động nhạy cảm.
    // Chỉ log metadata bộ lọc + actor để truy vết, không log dữ liệu hóa đơn.
    await container.system.auditWriter.write(
      req.user?.userId,
      "FINANCE_INVOICE_EXPORT",
      "invoice",
      undefined,
      {
        fromDate,
        toDate,
        status: status ?? null,
        enrollmentId: enrollmentId ?? null,
        overdue: typeof overdue === "boolean" ? overdue : null,
      }
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="invoices-${fromDate}-to-${toDate}.xlsx"`);

    await container.finance.exportInvoicesUseCase.stream(
      {
        fromDate,
        toDate,
        status,
        enrollmentId,
        overdue,
      },
      res,
    );
    return res.end();
  }

  /**
   * POST /finance/invoices
   * Ví dụ body: { "enrollmentId": "<uuid>", "amount": 3500000, "dueDate": "2026-04-01" }
   */
  async createInvoice(req: Request, res: Response) {
    const body = CreateInvoiceBodySchema.parse(req.body);
    const container = buildContainer();
    const data = await container.finance.createInvoiceUseCase.execute(body);

    // Audit: tạo hóa đơn là hành động nhạy cảm, chỉ log metadata tối thiểu để trace.
    await container.system.auditWriter.write(
      req.user?.userId,
      "FINANCE_INVOICE_CREATE",
      "invoice",
      data.id,
      {
        enrollmentId: body.enrollmentId,
        amount: body.amount,
        dueDate: body.dueDate,
      }
    );

    // Notifications tối thiểu: thông báo cho người thao tác để inbox không rỗng.
    if (req.user?.userId) {
      await container.system.notificationRepo.create({
        userId: req.user.userId,
        title: "Đã tạo hóa đơn",
        body: `Bạn đã tạo hóa đơn ${data.id} (hạn: ${data.dueDate}).`,
      });
    }
    return res.status(201).json({ success: true, data });
  }

  /**
   * GET /finance/invoices/:id
   * Trả về invoice kèm payments, paidAmount, remainingAmount
   */
  async getInvoice(req: Request, res: Response) {
    const id = String(req.params.id);
    const container = buildContainer();
    const data = await container.finance.getInvoiceUseCase.execute(id);
    return res.json({ success: true, data });
  }

  /**
   * PATCH /finance/invoices/:id/status
   * Ví dụ body: { "status": "ISSUED" }
   * Luồng: DRAFT->ISSUED->PAID/OVERDUE/CANCELED, OVERDUE->PAID/CANCELED
   */
  async updateInvoiceStatus(req: Request, res: Response) {
    const id = String(req.params.id);
    const body = UpdateInvoiceStatusBodySchema.parse(req.body);
    const container = buildContainer();
    const before = await container.finance.getInvoiceUseCase.execute(id);
    const data = await container.finance.updateInvoiceStatusUseCase.execute(id, body);

    // Audit: đổi trạng thái hóa đơn, chỉ log trước/sau để giải thích được thay đổi.
    await container.system.auditWriter.write(
      req.user?.userId,
      "FINANCE_INVOICE_STATUS_UPDATE",
      "invoice",
      id,
      {
        fromStatus: before?.status,
        toStatus: data.status,
      }
    );

    if (req.user?.userId) {
      await container.system.notificationRepo.create({
        userId: req.user.userId,
        title: "Đã cập nhật trạng thái hóa đơn",
        body: `Hóa đơn ${id} đã chuyển từ ${before?.status} → ${data.status}.`,
      });
    }
    return res.json({ success: true, data });
  }

  // ==========================================
  // PAYMENTS
  // ==========================================

  /**
   * GET /finance/payments/export
   * Xuất danh sách thanh toán (payments) ra Excel
   */
  async exportPayments(req: Request, res: Response) {
    const fromDate = req.query.fromDate as unknown as string;
    const toDate = req.query.toDate as unknown as string;
    const method = typeof req.query.method === "string" ? req.query.method : undefined;
    const limit =
      typeof req.query.limit === "string" && req.query.limit.trim() !== ""
        ? Number(req.query.limit)
        : undefined;

    if (!fromDate || !toDate) {
      return res.status(400).json({ success: false, error: "Thiếu tham số fromDate hoặc toDate" });
    }

    const container = buildContainer();
    // Audit: export thanh toán là hành động nhạy cảm.
    await container.system.auditWriter.write(
      req.user?.userId,
      "FINANCE_PAYMENT_EXPORT",
      "payment",
      undefined,
      {
        fromDate,
        toDate,
        method: method ?? null,
        limit: typeof limit === "number" ? limit : null,
      },
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="payments-${fromDate}-to-${toDate}.xlsx"`,
    );

    await container.finance.exportPaymentsUseCase.stream(
      {
        fromDate,
        toDate,
        method,
        limit,
      },
      res,
    );
    return res.end();
  }

  /**
   * POST /finance/payments
   * Ví dụ body: { "invoiceId": "<uuid>", "amount": 3500000, "method": "TRANSFER", "paidAt": "2026-03-07T10:00:00Z" }
   * Rules:
   *  - Hóa đơn không được CANCELED
   *  - Nếu DRAFT -> tự động chuyển ISSUED rồi nhận tiền
   *  - amount không được vượt quá số tiền còn lại
   *  - Nếu đủ tiền -> tự động chuyển PAID
   */
  async createPayment(req: Request, res: Response) {
    const body = CreatePaymentBodySchema.parse(req.body);
    const container = buildContainer();
    const data = await container.finance.createPaymentUseCase.execute(body);

    // Audit: tạo payment là hành động nhạy cảm, không log thông tin thừa.
    await container.system.auditWriter.write(
      req.user?.userId,
      "FINANCE_PAYMENT_CREATE",
      "payment",
      data.id,
      {
        invoiceId: body.invoiceId,
        amount: body.amount,
        method: body.method,
        paidAt: body.paidAt,
      }
    );

    if (req.user?.userId) {
      await container.system.notificationRepo.create({
        userId: req.user.userId,
        title: "Đã ghi nhận thanh toán",
        body: `Bạn đã ghi nhận thanh toán ${body.amount} cho hóa đơn ${body.invoiceId}.`,
      });
    }
    return res.status(201).json({ success: true, data });
  }

  // ==========================================
  // STUDENT FINANCE SUMMARY
  // ==========================================

  /**
   * GET /students/:id/finance
   * Trả về tóm tắt tài chính của học viên: enrollments + invoices + paidAmount + remainingAmount
   */
  async getStudentFinance(req: Request, res: Response) {
    const studentId = String(req.params.id);
    StudentFinanceQuerySchema.parse(req.query); // Validate query params dù không dùng trong usecase
    const container = buildContainer();
    const data = await container.finance.getStudentFinanceUseCase.execute(studentId);
    return res.json({ success: true, data });
  }
}

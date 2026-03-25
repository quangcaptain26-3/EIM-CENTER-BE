import type { StudentPaymentStatusRepoPort } from "../../../domain/finance/repositories/student-payment-status.repo.port";
import type { PaymentStatusFilter } from "../dtos/student-payment-status.dto";
import { FinanceExporter } from "../../../infrastructure/excel/finance.exporter";
import type { Writable } from "stream";

const MAX_EXPORT_ROWS = 10000;

/**
 * UseCase: Xuất danh sách trạng thái thanh toán học sinh ra Excel.
 * Logic bám đúng list: enrollment + invoice + payment status.
 */
export class ExportStudentPaymentStatusUseCase {
  constructor(
    private readonly repo: StudentPaymentStatusRepoPort,
    private readonly exporter: FinanceExporter
  ) {}

  async execute(params: {
    paymentStatus?: PaymentStatusFilter;
    classId?: string;
    programId?: string;
    keyword?: string;
  }) {
    const rows = await this.repo.list({
      ...params,
      limit: MAX_EXPORT_ROWS + 1,
      offset: 0,
    });

    if (rows.length > MAX_EXPORT_ROWS) {
      const { AppError } = await import("../../../shared/errors/app-error");
      throw AppError.badRequest("Số dòng xuất vượt ngưỡng an toàn", {
        code: "FINANCE_STUDENT_PAYMENT_EXPORT/ROW_LIMIT_EXCEEDED",
        rowLimit: MAX_EXPORT_ROWS,
      });
    }

    const items = rows.map((r) => {
      const remaining = Math.max(0, r.invoice_amount - r.paid_amount);
      let paymentStatus: string = "unpaid";
      if (!r.invoice_id) paymentStatus = "no_invoice";
      else if (remaining <= 0) paymentStatus = "paid";
      else if (r.invoice_status === "DRAFT") paymentStatus = r.paid_amount > 0 ? "partial" : "unpaid";
      else if (r.due_date && new Date(r.due_date) < new Date()) paymentStatus = "overdue";
      else if (r.paid_amount > 0) paymentStatus = "partial";

      return {
        studentId: r.student_id,
        studentName: r.student_name ?? "",
        enrollmentId: r.enrollment_id,
        classCode: r.class_code,
        programName: r.program_name ?? "",
        invoiceAmount: r.invoice_amount,
        paidAmount: r.paid_amount,
        remainingAmount: remaining,
        dueDate: r.due_date ? r.due_date.toISOString().slice(0, 10) : null,
        paymentStatus,
      };
    });

    const workbook = this.exporter.exportStudentPaymentStatus(items);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async stream(
    params: {
      paymentStatus?: PaymentStatusFilter;
      classId?: string;
      programId?: string;
      keyword?: string;
    },
    writable: Writable
  ): Promise<void> {
    const rows = await this.repo.list({
      ...params,
      limit: MAX_EXPORT_ROWS + 1,
      offset: 0,
    });

    if (rows.length > MAX_EXPORT_ROWS) {
      const { AppError } = await import("../../../shared/errors/app-error");
      throw AppError.badRequest("Số dòng xuất vượt ngưỡng an toàn", {
        code: "FINANCE_STUDENT_PAYMENT_EXPORT/ROW_LIMIT_EXCEEDED",
        rowLimit: MAX_EXPORT_ROWS,
      });
    }

    const items = rows.map((r) => {
      const remaining = Math.max(0, r.invoice_amount - r.paid_amount);
      let paymentStatus: string = "unpaid";
      if (!r.invoice_id) paymentStatus = "no_invoice";
      else if (remaining <= 0) paymentStatus = "paid";
      else if (r.invoice_status === "DRAFT") paymentStatus = r.paid_amount > 0 ? "partial" : "unpaid";
      else if (r.due_date && new Date(r.due_date) < new Date()) paymentStatus = "overdue";
      else if (r.paid_amount > 0) paymentStatus = "partial";

      return {
        studentId: r.student_id,
        studentName: r.student_name ?? "",
        enrollmentId: r.enrollment_id,
        classCode: r.class_code,
        programName: r.program_name ?? "",
        invoiceAmount: r.invoice_amount,
        paidAmount: r.paid_amount,
        remainingAmount: remaining,
        dueDate: r.due_date ? r.due_date.toISOString().slice(0, 10) : null,
        paymentStatus,
      };
    });

    const workbook = this.exporter.exportStudentPaymentStatus(items);
    await workbook.xlsx.write(writable);
  }
}

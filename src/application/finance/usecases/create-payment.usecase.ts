import { AppError } from "../../../shared/errors/app-error";
import { InvoiceRepoPort } from "../../../domain/finance/repositories/invoice.repo.port";
import { PaymentRepoPort } from "../../../domain/finance/repositories/payment.repo.port";
import { CreatePaymentBody } from "../dtos/payment.dto";
import { mapPayment } from "../mappers/finance.mapper";
import { pool } from "../../../infrastructure/db/pg-pool";

/**
 * UseCase: Tạo một khoản thanh toán mới cho Hóa đơn.
 *
 * Business rules:
 *  - Nếu invoice.status là CANCELED -> từ chối (badRequest)
 *  - Nếu invoice.status là DRAFT -> AUTO chuyển sang ISSUED trước khi nhận tiền
 *    (Lý do: thực tế khi khách đóng tiền thì hóa đơn phải đã được phát hành)
 *  - Số tiền thanh toán không được vượt quá phần còn lại (remaining = amount - sumPaid)
 *  - Sau khi tạo payment, kiểm tra nếu đã đủ thì tự động chuyển invoice sang PAID
 */
export class CreatePaymentUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepoPort,
    private readonly paymentRepo: PaymentRepoPort,
  ) {}

  async execute(body: CreatePaymentBody) {
    // Chống race condition payment:
    // - Lock invoice row (FOR UPDATE) để serialize các ghi nhận thanh toán cùng một invoice.
    // - Tính remaining và insert payment trong cùng transaction.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const invRes = await client.query(
        `SELECT * FROM finance_invoices WHERE id = $1 FOR UPDATE`,
        [body.invoiceId],
      );
      if (invRes.rows.length === 0) {
        throw AppError.notFound("Không tìm thấy hóa đơn", { code: "FINANCE/INVOICE_NOT_FOUND", invoiceId: body.invoiceId });
      }
      const invRow = invRes.rows[0] as {
        id: string;
        amount: number;
        status: string;
        due_date: Date;
      };

      if (invRow.status === "CANCELED") {
        throw AppError.badRequest("Không thể thanh toán cho hóa đơn đã hủy", {
          code: "FINANCE/INVOICE_CANCELED",
          invoiceId: body.invoiceId,
        });
      }
      if (invRow.status === "PAID") {
        throw AppError.badRequest("Không thể thanh toán thêm cho hóa đơn đã thanh toán đủ", {
          code: "FINANCE/INVOICE_ALREADY_PAID",
          invoiceId: body.invoiceId,
        });
      }

      // Auto chuyển sang ISSUED nếu đang ở DRAFT (trong cùng transaction)
      if (invRow.status === "DRAFT") {
        await client.query(
          `UPDATE finance_invoices SET status = 'ISSUED', issued_at = NOW() WHERE id = $1`,
          [body.invoiceId],
        );
      }

      const sumRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM finance_payments WHERE invoice_id = $1`,
        [body.invoiceId],
      );
      const paidAmount = Number(sumRes.rows[0]?.paid ?? 0);
      const remainingAmount = Number(invRow.amount) - paidAmount;
      if (remainingAmount <= 0) {
        throw AppError.badRequest("Hóa đơn đã được thanh toán đủ, không còn số tiền cần thu", {
          code: "FINANCE/INVOICE_ALREADY_PAID",
          invoiceId: body.invoiceId,
        });
      }
      if (body.amount > remainingAmount) {
        throw AppError.badRequest(
          `Số tiền thanh toán (${body.amount}) vượt quá số tiền còn lại (${remainingAmount})`,
          { code: "FINANCE/PAYMENT_EXCEEDS_REMAINING", invoiceId: body.invoiceId, remainingAmount },
        );
      }

      const payRes = await client.query(
        `INSERT INTO finance_payments (invoice_id, amount, method, paid_at)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [body.invoiceId, body.amount, body.method, new Date(body.paidAt)],
      );

      // Nếu đã đủ tiền -> tự động đánh dấu PAID (atomic)
      const afterSumRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS paid FROM finance_payments WHERE invoice_id = $1`,
        [body.invoiceId],
      );
      const paidAfter = Number(afterSumRes.rows[0]?.paid ?? 0);
      if (paidAfter >= Number(invRow.amount)) {
        await client.query(
          `UPDATE finance_invoices SET status = 'PAID' WHERE id = $1 AND status <> 'CANCELED'`,
          [body.invoiceId],
        );
      } else {
        // Cập nhật trạng thái hiệu lực dựa trên dueDate + còn lại sau khi ghi payment.
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        const due = new Date(invRow.due_date);
        due.setHours(0, 0, 0, 0);

        if (due < today) {
          await client.query(
            `UPDATE finance_invoices SET status = 'OVERDUE' WHERE id = $1 AND status <> 'CANCELED'`,
            [body.invoiceId],
          );
        } else if (invRow.status === "OVERDUE") {
          // Tránh case DB bị "kẹt" OVERDUE nhưng chưa tới hạn.
          await client.query(
            `UPDATE finance_invoices SET status = 'ISSUED' WHERE id = $1 AND status = 'OVERDUE'`,
            [body.invoiceId],
          );
        }
      }

      await client.query("COMMIT");

      // Reuse mapper để trả response đúng format
      const payment = payRes.rows[0] as {
        id: string;
        invoice_id: string;
        amount: number;
        method: string;
        paid_at: Date;
        created_at: Date;
      };
      return mapPayment({
        id: payment.id,
        invoiceId: payment.invoice_id,
        amount: Number(payment.amount),
        method: payment.method,
        paidAt: new Date(payment.paid_at),
        createdAt: new Date(payment.created_at),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

import { pool } from "../../pg-pool";
import { Payment } from "../../../../domain/finance/entities/payment.entity";
import { PaymentRepoPort } from "../../../../domain/finance/repositories/payment.repo.port";

/**
 * Implementation PostgreSQL cho PaymentRepoPort.
 */
export class PaymentPgRepo implements PaymentRepoPort {
  private mapRow(row: any): Payment {
    return {
      id:        row.id,
      invoiceId: row.invoice_id,
      amount:    Number(row.amount),
      method:    row.method,
      paidAt:    new Date(row.paid_at),
      createdAt: new Date(row.created_at),
    };
  }

  /** Tạo mới một khoản thanh toán */
  async create(input: Omit<Payment, "id" | "createdAt">): Promise<Payment> {
    const { rows } = await pool.query(
      `INSERT INTO finance_payments (invoice_id, amount, method, paid_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.invoiceId, input.amount, input.method, input.paidAt]
    );
    return this.mapRow(rows[0]);
  }

  /** Lấy danh sách thanh toán của một Hóa đơn */
  async listByInvoice(invoiceId: string): Promise<Payment[]> {
    const { rows } = await pool.query(
      `SELECT * FROM finance_payments WHERE invoice_id = $1 ORDER BY paid_at ASC`,
      [invoiceId]
    );
    return rows.map(this.mapRow.bind(this));
  }

  /** Tính tổng số tiền đã thanh toán của một Hóa đơn */
  async sumPaid(invoiceId: string): Promise<number> {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM finance_payments WHERE invoice_id = $1`,
      [invoiceId]
    );
    return Number(rows[0]?.total ?? 0);
  }

  /** Lấy ngày thanh toán gần nhất của một Hóa đơn */
  async getLastPaidAt(invoiceId: string): Promise<Date | null> {
    const { rows } = await pool.query(
      `SELECT MAX(paid_at) AS last_paid_at FROM finance_payments WHERE invoice_id = $1`,
      [invoiceId],
    );
    const v = rows[0]?.last_paid_at;
    if (!v) return null;
    return new Date(v);
  }

  /**
   * Export thanh toán (payments) ra danh sách dòng chi tiết.
   * Trả về dữ liệu đã join sẵn: student/program/invoice/payment.
   */
  async listForExport(params: {
    fromDate: string;
    toDate: string;
    method?: string;
    limit?: number;
  }): Promise<any[]> {
    const { fromDate, toDate, method, limit = 5000 } = params;

    const values: any[] = [fromDate, toDate];
    let idx = 3;

    let where = `WHERE p.paid_at::date >= $1::date AND p.paid_at::date <= $2::date`;
    if (method) {
      where += ` AND p.method = $${idx++}`;
      values.push(method);
    }

    const query = `
      SELECT
        p.id AS payment_id,
        p.amount AS payment_amount,
        p.method AS payment_method,
        p.paid_at AS paid_at,
        p.created_at AS payment_created_at,
        i.id AS invoice_id,
        i.due_date AS due_date,
        i.status AS invoice_status,
        s.full_name AS student_name,
        cp.name AS program_name
      FROM finance_payments p
      JOIN finance_invoices i ON p.invoice_id = i.id
      JOIN enrollments e ON i.enrollment_id = e.id
      JOIN students s ON e.student_id = s.id
      LEFT JOIN classes c ON e.class_id = c.id
      LEFT JOIN curriculum_programs cp ON c.program_id = cp.id
      ${where}
      ORDER BY p.paid_at ASC, p.created_at ASC
      LIMIT $${idx}
    `;

    values.push(limit);

    const { rows } = await pool.query(query, values);
    return rows;
  }
}

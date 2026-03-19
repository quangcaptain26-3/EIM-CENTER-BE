import { pool } from "../../pg-pool";
import { Invoice } from "../../../../domain/finance/entities/invoice.entity";
import { InvoiceStatus } from "../../../../domain/finance/value-objects/invoice-status.vo";
import { InvoiceRepoPort } from "../../../../domain/finance/repositories/invoice.repo.port";

/**
 * Implementation PostgreSQL cho InvoiceRepoPort.
 */
export class InvoicePgRepo implements InvoiceRepoPort {
  private mapRow(row: any): Invoice {
    return {
      id:           row.id,
      enrollmentId: row.enrollment_id,
      studentName:  row.student_name ?? null,
      programName:  row.program_name ?? null,
      feePlanId:    row.fee_plan_id ?? null,
      currency:     row.currency ?? null,
      amount:       Number(row.amount),
      status:       row.status as InvoiceStatus,
      dueDate:      new Date(row.due_date),
      issuedAt:     row.issued_at ? new Date(row.issued_at) : undefined,
      createdAt:    new Date(row.created_at),
    };
  }

  /** Liệt kê hóa đơn với lọc và phân trang */
  async list(params: {
    status?: InvoiceStatus;
    enrollmentId?: string;
    overdue?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Invoice[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    // overdue=true hoặc status=OVERDUE: lọc theo "effective overdue" thống nhất:
    // - (ISSUED/OVERDUE)
    // - due_date < CURRENT_DATE (quá hạn)
    // - remainingAmount > 0 (amount - sum(payments) > 0)
    const shouldFetchEffectiveOverdue = params.overdue === true || params.status === "OVERDUE";
    if (shouldFetchEffectiveOverdue) {
      conditions.push(`i.status IN ('ISSUED', 'OVERDUE')`);
      conditions.push(`i.due_date < CURRENT_DATE`);
      conditions.push(
        `(i.amount - COALESCE((SELECT COALESCE(SUM(p.amount), 0) FROM finance_payments p WHERE p.invoice_id = i.id), 0)) > 0`
      );
    } else if (params.status) {
      conditions.push(`i.status = $${idx++}`);
      values.push(params.status);
    }
    if (params.enrollmentId) { conditions.push(`i.enrollment_id = $${idx++}`); values.push(params.enrollmentId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(params.limit  ?? 20);
    values.push(params.offset ?? 0);
    const { rows } = await pool.query(
      `
        SELECT
          i.*,
          s.full_name AS student_name,
          cp.name AS program_name
        FROM finance_invoices i
        JOIN enrollments e ON i.enrollment_id = e.id
        JOIN students s ON e.student_id = s.id
        LEFT JOIN classes c ON e.class_id = c.id
        LEFT JOIN curriculum_programs cp ON c.program_id = cp.id
        ${where}
        ORDER BY i.created_at DESC
        LIMIT $${idx++} OFFSET $${idx}
      `,
      values
    );
    return rows.map(this.mapRow.bind(this));
  }

  /** Đếm tổng số hóa đơn thỏa điều kiện */
  async count(params: { status?: InvoiceStatus; enrollmentId?: string; overdue?: boolean }): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const shouldCountEffectiveOverdue = params.overdue === true || params.status === "OVERDUE";
    if (shouldCountEffectiveOverdue) {
      conditions.push(`i.status IN ('ISSUED', 'OVERDUE')`);
      conditions.push(`i.due_date < CURRENT_DATE`);
      conditions.push(
        `(i.amount - COALESCE((SELECT COALESCE(SUM(p.amount), 0) FROM finance_payments p WHERE p.invoice_id = i.id), 0)) > 0`
      );
    } else {
      if (params.status)       { conditions.push(`i.status = $${idx++}`);        values.push(params.status); }
    }

    if (params.enrollmentId) { conditions.push(`i.enrollment_id = $${idx++}`); values.push(params.enrollmentId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS total FROM finance_invoices i ${where}`,
      values
    );
    return Number(rows[0]?.total ?? 0);
  }

  /** Lấy danh sách hóa đơn để xuất Excel (có join) */
  async listForExport(params: {
    fromDate: string;
    toDate: string;
    status?: string;
    enrollmentId?: string;
    overdue?: boolean;
    limit?: number;
  }): Promise<any[]> {
    const whereConditions: string[] = [];
    const havingConditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    // Semantics chuẩn cho Export: fromDate/toDate áp dụng theo due_date (hạn thanh toán),
    // (yêu cầu hiện tại: lọc theo created_at cho "khoảng xuất").
    whereConditions.push(`i.created_at >= $${idx++}::date`);
    values.push(params.fromDate);
    
    whereConditions.push(`i.created_at <= $${idx++}::date`);
    values.push(params.toDate);

    if (params.status) {
      whereConditions.push(`i.status = $${idx++}`);
      values.push(params.status);
    }
    if (params.enrollmentId) {
      whereConditions.push(`i.enrollment_id = $${idx++}`);
      values.push(params.enrollmentId);
    }

    // Overdue semantics (export):
    // - status có thể là ISSUED hoặc OVERDUE
    // - due_date đã qua (so với CURRENT_DATE)
    // - và remainingAmount > 0 (amount - sum(payments) > 0)
    if (params.overdue === true) {
      whereConditions.push(`i.status IN ('ISSUED', 'OVERDUE')`);
      whereConditions.push(`i.due_date < CURRENT_DATE`);
      havingConditions.push(`(i.amount - COALESCE(SUM(p.amount), 0)) > 0`);
    }

    const where = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
    const having = havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

    const query = `
      SELECT 
        i.id AS invoice_id,
        i.amount AS total_amount,
        i.status,
        i.due_date,
        s.full_name AS student_name,
        cp.name AS program_name,
        COALESCE(SUM(p.amount), 0) AS paid_amount,
        MAX(p.paid_at) AS last_payment_date
      FROM finance_invoices i
      JOIN enrollments e ON i.enrollment_id = e.id
      JOIN students s ON e.student_id = s.id
      LEFT JOIN classes c ON e.class_id = c.id
      LEFT JOIN curriculum_programs cp ON c.program_id = cp.id
      LEFT JOIN finance_payments p ON p.invoice_id = i.id
      ${where}
      GROUP BY i.id, s.full_name, cp.name
      ${having}
      ORDER BY i.due_date ASC, i.created_at ASC
      LIMIT $${idx++}
    `;
    values.push(params.limit ?? 10000);
    const { rows } = await pool.query(query, values);
    return rows;
  }

  /** Tạo hóa đơn mới */
  async create(
    input: Omit<Invoice, "id" | "createdAt" | "issuedAt"> & { status?: InvoiceStatus }
  ): Promise<Invoice> {
    const { rows } = await pool.query(
      `INSERT INTO finance_invoices (enrollment_id, fee_plan_id, amount, currency, status, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.enrollmentId,
        input.feePlanId ?? null,
        input.amount,
        input.currency ?? "VND",
        input.status ?? "DRAFT",
        input.dueDate,
      ]
    );
    return this.mapRow(rows[0]);
  }

  /** Tìm hóa đơn theo ID */
  async findById(id: string): Promise<Invoice | null> {
    const { rows } = await pool.query(
      `
        SELECT
          i.*,
          s.full_name AS student_name,
          cp.name AS program_name
        FROM finance_invoices i
        JOIN enrollments e ON i.enrollment_id = e.id
        JOIN students s ON e.student_id = s.id
        LEFT JOIN classes c ON e.class_id = c.id
        LEFT JOIN curriculum_programs cp ON c.program_id = cp.id
        WHERE i.id = $1
      `,
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  /** Cập nhật trạng thái hóa đơn */
  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const { rows } = await pool.query(
      `UPDATE finance_invoices SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (rows.length === 0) throw new Error("Không tìm thấy hóa đơn để cập nhật trạng thái");
    return this.mapRow(rows[0]);
  }

  /** Chuyển sang ISSUED và đặt issued_at = now() */
  async markIssued(id: string): Promise<Invoice> {
    const { rows } = await pool.query(
      `UPDATE finance_invoices SET status = 'ISSUED', issued_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (rows.length === 0) throw new Error("Không tìm thấy hóa đơn để phát hành");
    return this.mapRow(rows[0]);
  }

  /**
   * Helper (optional): Tự động chuyển sang PAID nếu tổng thanh toán đã >= số tiền hóa đơn.
   * Được gọi sau khi tạo một payment mới để kiểm tra và đổi trạng thái.
   */
  async markPaidIfFullyPaid(invoiceId: string): Promise<Invoice> {
    const { rows: sumRows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid FROM finance_payments WHERE invoice_id = $1`,
      [invoiceId]
    );
    const paid = Number(sumRows[0].paid);

    const { rows: invRows } = await pool.query(
      `SELECT * FROM finance_invoices WHERE id = $1`,
      [invoiceId]
    );
    if (invRows.length === 0) throw new Error("Không tìm thấy hóa đơn");

    const inv = this.mapRow(invRows[0]);
    if (paid >= inv.amount && inv.status !== "PAID" && inv.status !== "CANCELED") {
      return this.updateStatus(invoiceId, "PAID");
    }
    return inv;
  }
}

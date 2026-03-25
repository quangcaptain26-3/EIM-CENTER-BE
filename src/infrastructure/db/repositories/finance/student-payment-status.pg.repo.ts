import { pool } from "../../pg-pool";
import type { PaymentStatusFilter } from "../../../../application/finance/dtos/student-payment-status.dto";
import type {
  StudentPaymentStatusRepoPort,
  StudentPaymentStatusRow,
} from "../../../../domain/finance/repositories/student-payment-status.repo.port";

/**
 * Repo: Truy vấn danh sách trạng thái thanh toán học sinh.
 * Logic: enrollment + invoice + payment, không gộp theo student.
 * Mỗi dòng = (enrollment, invoice) hoặc (enrollment) khi chưa có invoice.
 */
export class StudentPaymentStatusPgRepo implements StudentPaymentStatusRepoPort {
  async list(params: {
    paymentStatus?: PaymentStatusFilter;
    classId?: string;
    programId?: string;
    keyword?: string;
    limit: number;
    offset: number;
  }): Promise<StudentPaymentStatusRow[]> {
    const values: unknown[] = [
      params.classId ?? null,
      params.classId ?? null,
      params.programId ?? null,
      params.programId ?? null,
      params.keyword ?? null,
      params.keyword ?? null,
      params.paymentStatus ?? null,
      params.paymentStatus ?? null,
      params.limit,
      params.offset,
    ];
    const { rows } = await pool.query<StudentPaymentStatusRow>(
      `
      WITH base AS (
        SELECT
          s.id AS student_id,
          s.full_name AS student_name,
          e.id AS enrollment_id,
          c.id AS class_id,
          c.code AS class_code,
          cp.id AS program_id,
          cp.name AS program_name,
          i.id AS invoice_id,
          COALESCE(i.amount, 0)::int AS invoice_amount,
          COALESCE(paid.total, 0)::int AS paid_amount,
          i.status AS invoice_status,
          i.due_date
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        LEFT JOIN classes c ON e.class_id = c.id
        LEFT JOIN curriculum_programs cp ON c.program_id = cp.id
        LEFT JOIN finance_invoices i ON i.enrollment_id = e.id AND i.status != 'CANCELED'
        LEFT JOIN (
          SELECT invoice_id, SUM(amount)::int AS total
          FROM finance_payments
          GROUP BY invoice_id
        ) paid ON paid.invoice_id = i.id
        WHERE e.status IN ('ACTIVE', 'PAUSED')
          AND ($1::uuid IS NULL OR c.id = $2)
          AND ($3::uuid IS NULL OR cp.id = $4)
          AND ($5::text IS NULL OR s.full_name ILIKE '%' || $6 || '%')
      ),
      computed AS (
        SELECT *,
          (invoice_amount - paid_amount) AS remaining_amount,
          CASE
            WHEN invoice_id IS NULL THEN 'no_invoice'
            WHEN (invoice_amount - paid_amount) <= 0 THEN 'paid'
            WHEN invoice_status = 'DRAFT' THEN
              CASE WHEN paid_amount > 0 THEN 'partial' ELSE 'unpaid' END
            WHEN due_date < CURRENT_DATE AND (invoice_amount - paid_amount) > 0 THEN 'overdue'
            WHEN paid_amount > 0 THEN 'partial'
            ELSE 'unpaid'
          END AS payment_status
        FROM base
      )
      SELECT
        student_id,
        student_name,
        enrollment_id,
        class_id,
        class_code,
        program_id,
        program_name,
        invoice_id,
        invoice_amount,
        paid_amount,
        invoice_status,
        due_date
      FROM computed
      WHERE ($7::text IS NULL OR payment_status = $8)
      ORDER BY
        CASE payment_status
          WHEN 'overdue' THEN 1
          WHEN 'no_invoice' THEN 2
          WHEN 'unpaid' THEN 3
          WHEN 'partial' THEN 4
          ELSE 5
        END,
        due_date NULLS LAST,
        enrollment_id
      LIMIT $9 OFFSET $10
      `,
      values
    );
    return rows;
  }

  async count(params: {
    paymentStatus?: PaymentStatusFilter;
    classId?: string;
    programId?: string;
    keyword?: string;
  }): Promise<number> {
    const values: unknown[] = [
      params.classId ?? null,
      params.classId ?? null,
      params.programId ?? null,
      params.programId ?? null,
      params.keyword ?? null,
      params.keyword ?? null,
      params.paymentStatus ?? null,
      params.paymentStatus ?? null,
    ];
    const { rows } = await pool.query<{ total: string }>(
      `
      WITH base AS (
        SELECT
          s.id AS student_id,
          e.id AS enrollment_id,
          i.id AS invoice_id,
          COALESCE(i.amount, 0)::int AS invoice_amount,
          COALESCE(paid.total, 0)::int AS paid_amount,
          i.status AS invoice_status,
          i.due_date
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        LEFT JOIN classes c ON e.class_id = c.id
        LEFT JOIN curriculum_programs cp ON c.program_id = cp.id
        LEFT JOIN finance_invoices i ON i.enrollment_id = e.id AND i.status != 'CANCELED'
        LEFT JOIN (
          SELECT invoice_id, SUM(amount)::int AS total
          FROM finance_payments
          GROUP BY invoice_id
        ) paid ON paid.invoice_id = i.id
        WHERE e.status IN ('ACTIVE', 'PAUSED')
          AND ($1::uuid IS NULL OR c.id = $2)
          AND ($3::uuid IS NULL OR cp.id = $4)
          AND ($5::text IS NULL OR s.full_name ILIKE '%' || $6 || '%')
      ),
      computed AS (
        SELECT
          CASE
            WHEN invoice_id IS NULL THEN 'no_invoice'
            WHEN (invoice_amount - paid_amount) <= 0 THEN 'paid'
            WHEN invoice_status = 'DRAFT' THEN
              CASE WHEN paid_amount > 0 THEN 'partial' ELSE 'unpaid' END
            WHEN due_date < CURRENT_DATE AND (invoice_amount - paid_amount) > 0 THEN 'overdue'
            WHEN paid_amount > 0 THEN 'partial'
            ELSE 'unpaid'
          END AS payment_status
        FROM base
      )
      SELECT COUNT(*) AS total
      FROM computed
      WHERE ($7::text IS NULL OR payment_status = $8)
      `,
      values
    );
    return Number(rows[0]?.total ?? 0);
  }
}

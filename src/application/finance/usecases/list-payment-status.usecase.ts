/**
 * Danh sách trạng thái đóng tiền / công nợ (trang Công nợ, KPI — Q5).
 *
 * Cách vận hành:
 * - Công nợ mỗi dòng: `debt = tuition_fee - COALESCE(SUM(receipts.amount), 0)` (tương đương `enrollment_debt()` trong các báo cáo khác).
 * - Mặc định `hasDebt = true`: chỉ enrollment `active` hoặc `paused` còn nợ (`debt > 0`).
 * - Filter `debtOver30Days`: thêm điều kiện nợ > 0 và `enrolled_at` quá 30 ngày (cảnh báo nợ lâu).
 */
import { ListPaymentStatusDto, ListPaymentStatusSchema } from '../dtos/finance.dto';

export interface PaymentStatusRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  parentPhone?: string;
  parentZalo?: string;
  classId: string;
  classCode: string;
  programCode: string;
  enrollmentStatus: string;
  enrolledAt: Date;
  tuitionFee: number;
  totalPaid: number;
  debt: number;
  isDebtOver30Days: boolean;
}

export class ListPaymentStatusUseCase {
  constructor(
    /** Raw db pool for complex joins */
    private readonly db: any,
  ) {}

  async execute(dto: ListPaymentStatusDto): Promise<{
    data: PaymentStatusRow[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter = ListPaymentStatusSchema.parse(dto);
    // Mặc định màn hình học phí chỉ hiển thị nhóm còn phải thu.
    // Nếu muốn đổi mặc định, sửa default hasDebt trong schema DTO.
    const hasDebt = filter.hasDebt ?? true;
    const statusList = filter.includePipeline
      ? `('active', 'paused', 'trial', 'reserved', 'pending')`
      : `('active', 'paused')`;
    const conditions: string[] = [`e.status IN ${statusList}`];
    const params: any[] = [];
    let idx = 1;

    if (filter.classId) {
      conditions.push(`e.class_id = $${idx++}`);
      params.push(filter.classId);
    }
    if (filter.programId) {
      conditions.push(`e.program_id = $${idx++}`);
      params.push(filter.programId);
    }
    if (filter.programCode) {
      conditions.push(`p.code = $${idx++}`);
      params.push(filter.programCode);
    }
    if (hasDebt) {
      conditions.push(`(e.tuition_fee - COALESCE(paid.total_paid, 0)) > 0`);
    }
    if (filter.debtOver30Days === true) {
      conditions.push(`(e.tuition_fee - COALESCE(paid.total_paid, 0)) > 0`);
      conditions.push(`e.enrolled_at <= now() - interval '30 days'`);
    }

    const where = conditions.join(' AND ');

    const baseQuery = `
      SELECT
        e.id            AS enrollment_id,
        e.student_id,
        e.class_id,
        c.class_code,
        e.status        AS enrollment_status,
        e.enrolled_at,
        e.tuition_fee,
        p.code AS program_code,
        s.full_name     AS student_name,
        s.parent_phone,
        s.parent_zalo,
        COALESCE(paid.total_paid, 0) AS total_paid
      FROM enrollments e
      JOIN programs    p  ON p.id = e.program_id
      JOIN classes     c  ON c.id = e.class_id
      JOIN students    s  ON s.id = e.student_id
      LEFT JOIN LATERAL (
        SELECT SUM(amount) AS total_paid
        FROM receipts
        WHERE enrollment_id = e.id
      ) paid ON TRUE
      WHERE ${where}
    `;

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM (${baseQuery}) AS sub`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (filter.page - 1) * filter.limit;
    const dataRes = await this.db.query(
      `${baseQuery}
       ORDER BY (e.tuition_fee - COALESCE(paid.total_paid, 0)) DESC, e.enrolled_at ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, filter.limit, offset],
    );

    const rows: PaymentStatusRow[] = dataRes.rows.map((r: any) => {
      const debt = Number(r.tuition_fee) - Number(r.total_paid);
      const enrolledAt = new Date(r.enrolled_at);
      const ageMs = Date.now() - enrolledAt.getTime();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      return {
      enrollmentId:     r.enrollment_id,
      studentId:        r.student_id,
      studentName:      r.student_name,
      parentPhone:      r.parent_phone ?? undefined,
      parentZalo:       r.parent_zalo ?? undefined,
      classId:          r.class_id,
      classCode:        r.class_code,
      programCode:      r.program_code,
      enrollmentStatus: r.enrollment_status,
      enrolledAt,
      tuitionFee:       Number(r.tuition_fee),
      totalPaid:        Number(r.total_paid),
      debt,
      isDebtOver30Days: debt > 0 && ageMs > THIRTY_DAYS_MS,
      };
    });

    return { data: rows, total, page: filter.page, limit: filter.limit };
  }
}

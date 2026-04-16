import { ListPaymentStatusDto, ListPaymentStatusSchema } from '../dtos/finance.dto';
import { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { IEnrollmentRepo } from '../../../domain/students/repositories/student.repo.port';
import { IStudentRepo } from '../../../domain/students/repositories/student.repo.port';

export interface PaymentStatusRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  parentPhone?: string;
  classId: string;
  programCode: string;
  enrollmentStatus: string;
  tuitionFee: number;
  totalPaid: number;
  debt: number;
}

export class ListPaymentStatusUseCase {
  constructor(
    private readonly receiptRepo: IReceiptRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly studentRepo: IStudentRepo,
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

    // Build a single SQL query to get enrollments + student info + paid sum
    const conditions: string[] = [`e.status IN ('active', 'paused')`];
    const params: any[] = [];
    let idx = 1;

    if (filter.classId) {
      conditions.push(`e.class_id = $${idx++}`);
      params.push(filter.classId);
    }
    if (filter.programCode) {
      conditions.push(`p.code = $${idx++}`);
      params.push(filter.programCode);
    }

    const where = conditions.join(' AND ');

    const baseQuery = `
      SELECT
        e.id            AS enrollment_id,
        e.student_id,
        e.class_id,
        e.status        AS enrollment_status,
        e.tuition_fee,
        p.code AS program_code,
        s.full_name     AS student_name,
        s.parent_phone,
        COALESCE(paid.total_paid, 0) AS total_paid
      FROM enrollments e
      JOIN programs    p  ON p.id = e.program_id
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
       ORDER BY s.full_name ASC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, filter.limit, offset],
    );

    let rows: PaymentStatusRow[] = dataRes.rows.map((r: any) => ({
      enrollmentId:     r.enrollment_id,
      studentId:        r.student_id,
      studentName:      r.student_name,
      parentPhone:      r.parent_phone ?? undefined,
      classId:          r.class_id,
      programCode:      r.program_code,
      enrollmentStatus: r.enrollment_status,
      tuitionFee:       Number(r.tuition_fee),
      totalPaid:        Number(r.total_paid),
      debt:             Number(r.tuition_fee) - Number(r.total_paid),
    }));

    // hasDebt filter (post-process — debt can be negative for overpays)
    if (filter.hasDebt !== undefined) {
      rows = rows.filter((r) =>
        filter.hasDebt ? r.debt > 0 : r.debt <= 0,
      );
    }

    return { data: rows, total, page: filter.page, limit: filter.limit };
  }
}

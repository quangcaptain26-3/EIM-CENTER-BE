import { FinanceDashboardDto, FinanceDashboardSchema } from '../dtos/finance.dto';

export interface ProgramBreakdown {
  programCode: string;
  cashBasis:   number;
  accrual:     number;
  enrollments: number;
}

export interface FinanceDashboardResult {
  period: string;
  cashBasis: number;
  accrualBasis: number;
  cashBasisSeries: Array<{ month: string; value: number }>;
  accrualBasisSeries: Array<{ month: string; value: number }>;
  newEnrollments: number;
  completions: number;
  drops: number;
  byProgram: ProgramBreakdown[];
  topDebtors: Array<{ studentId: string; studentName: string; debt: number; parentPhone?: string }>;
  pendingPayrollCount: number;
  pendingRefundCount: number;
}

export class FinanceDashboardUseCase {
  constructor(private readonly db: any) {}

  async execute(dto: FinanceDashboardDto): Promise<FinanceDashboardResult> {
    const filter = FinanceDashboardSchema.parse(dto);

    // Resolve date range
    const { startDate, endDate, periodLabel } = this.resolvePeriod(filter);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartMinus6 = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    // Run 5 queries in parallel for performance
    const [cashRes, accrualRes, enrollRes, completionRes, dropRes, programRes, cashSeriesRes, accrualSeriesRes, topDebtorsRes, pendingPayrollRes, pendingRefundRes] =
      await Promise.all([
        // 1. Cash basis: SUM receipts > 0 trong period
        this.db.query(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM receipts
           WHERE payment_date >= $1 AND payment_date < $2 AND amount > 0`,
          [startDate, endDate],
        ),

        // 2. Accrual basis: SUM tuition_fee enrollments trong period
        this.db.query(
          `SELECT COALESCE(SUM(tuition_fee), 0) AS total
           FROM enrollments
           WHERE enrolled_at >= $1 AND enrolled_at < $2`,
          [startDate, endDate],
        ),

        // 3. New enrollments count
        this.db.query(
          `SELECT COUNT(*) AS cnt FROM enrollments
           WHERE enrolled_at >= $1 AND enrolled_at < $2`,
          [startDate, endDate],
        ),

        // 4. Completions
        this.db.query(
          `SELECT COUNT(*) AS cnt FROM enrollments
           WHERE status = 'completed'
             AND updated_at >= $1 AND updated_at < $2`,
          [startDate, endDate],
        ),

        // 5. Drops
        this.db.query(
          `SELECT COUNT(*) AS cnt FROM enrollments
           WHERE status = 'dropped'
             AND updated_at >= $1 AND updated_at < $2`,
          [startDate, endDate],
        ),

        // 6. Breakdown by program
        this.db.query(
          `SELECT
             p.code AS program_code,
             COALESCE(SUM(r.amount) FILTER (WHERE r.amount > 0), 0)  AS cash_basis,
             COALESCE(SUM(e.tuition_fee), 0)                         AS accrual,
             COUNT(DISTINCT e.id)                                     AS enrollments
           FROM enrollments e
           JOIN programs p ON p.id = e.program_id
           LEFT JOIN receipts r
             ON r.enrollment_id = e.id
             AND r.payment_date >= $1 AND r.payment_date < $2
             AND r.amount > 0
           WHERE e.enrolled_at >= $1 AND e.enrolled_at < $2
           GROUP BY p.code
           ORDER BY cash_basis DESC`,
          [startDate, endDate],
        ),
        this.db.query(
          `SELECT to_char(date_trunc('month', payment_date), 'YYYY-MM') AS ym,
                  COALESCE(SUM(amount), 0) AS value
           FROM receipts
           WHERE payment_date >= $1 AND payment_date < $2
           GROUP BY date_trunc('month', payment_date)
           ORDER BY date_trunc('month', payment_date) ASC`,
          [monthStartMinus6, new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)],
        ),
        this.db.query(
          `SELECT to_char(date_trunc('month', enrolled_at), 'YYYY-MM') AS ym,
                  COALESCE(SUM(tuition_fee), 0) AS value
           FROM enrollments
           WHERE enrolled_at >= $1 AND enrolled_at < $2
           GROUP BY date_trunc('month', enrolled_at)
           ORDER BY date_trunc('month', enrolled_at) ASC`,
          [monthStartMinus6, new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)],
        ),
        this.db.query(
          `SELECT
             s.id AS student_id,
             s.full_name AS student_name,
             s.parent_phone,
             COALESCE(SUM(e.tuition_fee), 0) - COALESCE(SUM(r.total_paid), 0) AS debt
           FROM enrollments e
           JOIN students s ON s.id = e.student_id
           LEFT JOIN LATERAL (
             SELECT SUM(amount) AS total_paid
             FROM receipts
             WHERE enrollment_id = e.id
           ) r ON TRUE
           WHERE e.status IN ('active', 'paused')
           GROUP BY s.id, s.full_name, s.parent_phone
           HAVING (COALESCE(SUM(e.tuition_fee), 0) - COALESCE(SUM(r.total_paid), 0)) > 0
           ORDER BY debt DESC
           LIMIT 5`,
          [],
        ),
        this.db.query(
          `SELECT COUNT(DISTINCT u.id) AS cnt
           FROM users u
           WHERE u.role_id = (SELECT id FROM roles WHERE code = 'TEACHER')
             AND u.deleted_at IS NULL
             AND u.is_active = true
             AND NOT EXISTS (
               SELECT 1 FROM payroll_records pr
               WHERE pr.teacher_id = u.id
                 AND pr.period_month = $1
                 AND pr.period_year = $2
             )`,
          [now.getMonth() + 1, now.getFullYear()],
        ),
        this.db.query(
          `SELECT COUNT(*) AS cnt
           FROM refund_requests
           WHERE status = 'pending'`,
          [],
        ),
      ]);

    return {
      period:         periodLabel,
      cashBasis:      Number(cashRes.rows[0].total),
      accrualBasis:   Number(accrualRes.rows[0].total),
      cashBasisSeries: cashSeriesRes.rows.map((row: any) => ({
        month: row.ym,
        value: Number(row.value),
      })),
      accrualBasisSeries: accrualSeriesRes.rows.map((row: any) => ({
        month: row.ym,
        value: Number(row.value),
      })),
      newEnrollments: Number(enrollRes.rows[0].cnt),
      completions:    Number(completionRes.rows[0].cnt),
      drops:          Number(dropRes.rows[0].cnt),
      byProgram: programRes.rows.map((r: any) => ({
        programCode: r.program_code,
        cashBasis:   Number(r.cash_basis),
        accrual:     Number(r.accrual),
        enrollments: Number(r.enrollments),
      })),
      topDebtors: topDebtorsRes.rows.map((row: any) => ({
        studentId: row.student_id,
        studentName: row.student_name,
        debt: Number(row.debt),
        parentPhone: row.parent_phone ?? undefined,
      })),
      pendingPayrollCount: Number(pendingPayrollRes.rows[0].cnt),
      pendingRefundCount: Number(pendingRefundRes.rows[0].cnt),
    };
  }

  // ── Period resolver ──────────────────────────────────────────────────────

  private resolvePeriod(filter: FinanceDashboardDto): {
    startDate: Date;
    endDate: Date;
    periodLabel: string;
  } {
    const { month, year, quarter, yearFrom, yearTo } = filter;

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate   = new Date(year, month, 1);
      return { startDate, endDate, periodLabel: `${year}-${String(month).padStart(2, '0')}` };
    }

    if (quarter && year) {
      const startMonth = (quarter - 1) * 3;
      const startDate  = new Date(year, startMonth, 1);
      const endDate    = new Date(year, startMonth + 3, 1);
      return { startDate, endDate, periodLabel: `${year}-Q${quarter}` };
    }

    if (yearFrom && yearTo) {
      const startDate = new Date(yearFrom, 0, 1);
      const endDate   = new Date(yearTo + 1, 0, 1);
      return { startDate, endDate, periodLabel: `${yearFrom}–${yearTo}` };
    }

    // Default: full year
    const startDate = new Date(year, 0, 1);
    const endDate   = new Date(year + 1, 0, 1);
    return { startDate, endDate, periodLabel: `${year}` };
  }
}

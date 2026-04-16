import { FinanceDashboardDto, FinanceDashboardSchema } from '../dtos/finance.dto';

export interface ProgramBreakdown {
  programCode: string;
  cashBasis:   number;
  accrual:     number;
  enrollments: number;
}

export interface FinanceDashboardResult {
  period: string;
  cashBasis:       number;
  accrualBasis:    number;
  newEnrollments:  number;
  completions:     number;
  drops:           number;
  byProgram:       ProgramBreakdown[];
}

export class FinanceDashboardUseCase {
  constructor(private readonly db: any) {}

  async execute(dto: FinanceDashboardDto): Promise<FinanceDashboardResult> {
    const filter = FinanceDashboardSchema.parse(dto);

    // Resolve date range
    const { startDate, endDate, periodLabel } = this.resolvePeriod(filter);

    // Run 5 queries in parallel for performance
    const [cashRes, accrualRes, enrollRes, completionRes, dropRes, programRes] =
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
      ]);

    return {
      period:         periodLabel,
      cashBasis:      Number(cashRes.rows[0].total),
      accrualBasis:   Number(accrualRes.rows[0].total),
      newEnrollments: Number(enrollRes.rows[0].cnt),
      completions:    Number(completionRes.rows[0].cnt),
      drops:          Number(dropRes.rows[0].cnt),
      byProgram: programRes.rows.map((r: any) => ({
        programCode: r.program_code,
        cashBasis:   Number(r.cash_basis),
        accrual:     Number(r.accrual),
        enrollments: Number(r.enrollments),
      })),
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

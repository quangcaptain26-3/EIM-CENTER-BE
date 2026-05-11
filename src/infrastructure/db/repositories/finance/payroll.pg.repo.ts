import { IPayrollRepo, PayrollFilter } from '../../../../domain/finance/repositories/receipt.repo.port';
import { PayrollEntity, PayrollSessionDetail } from '../../../../domain/finance/entities/payroll.entity';

export class PayrollPgRepo implements IPayrollRepo {
  constructor(private readonly db: any) {}

  // ── Mapping ──────────────────────────────────────────────────────────────

  private mapToEntity(row: any): PayrollEntity {
    return new PayrollEntity(
      row.id,
      row.payroll_code,
      row.teacher_id,
      Number(row.period_month),
      Number(row.period_year),
      Number(row.sessions_count),
      Number(row.salary_per_session_snapshot),
      Number(row.allowance_snapshot),
      Number(row.total_salary),
      row.finalized_by,
      row.finalized_at,
    );
  }

  private mapDetailToEntity(row: any): PayrollSessionDetail {
    return new PayrollSessionDetail(
      row.id,
      row.payroll_id,
      row.session_id,
      row.session_date,
      row.class_code,
      Boolean(row.was_cover),
    );
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async findById(id: string): Promise<PayrollEntity | null> {
    const res = await this.db.query(
      `SELECT * FROM payroll_records WHERE id = $1`,
      [id],
    );
    if (!res.rows[0]) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async findByTeacherAndPeriod(
    teacherId: string,
    month: number,
    year: number,
  ): Promise<PayrollEntity | null> {
    const res = await this.db.query(
      `SELECT * FROM payroll_records
       WHERE teacher_id = $1 AND period_month = $2 AND period_year = $3
       LIMIT 1`,
      [teacherId, month, year],
    );
    if (!res.rows[0]) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async findAll(
    filter: PayrollFilter,
  ): Promise<{ data: PayrollEntity[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filter.teacherId) {
      conditions.push(`teacher_id = $${idx++}`);
      params.push(filter.teacherId);
    }
    if (filter.month !== undefined) {
      conditions.push(`period_month = $${idx++}`);
      params.push(filter.month);
    }
    if (filter.year !== undefined) {
      conditions.push(`period_year = $${idx++}`);
      params.push(filter.year);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM payroll_records ${where}`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (filter.page - 1) * filter.limit;
    const dataRes = await this.db.query(
      `SELECT * FROM payroll_records ${where}
       ORDER BY period_year DESC, period_month DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, filter.limit, offset],
    );

    return {
      data: dataRes.rows.map((r: any) => this.mapToEntity(r)),
      total,
    };
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Tạo payroll + session details trong 1 database transaction:
   * BEGIN → INSERT payroll_records → INSERT payroll_session_details (bulk) → COMMIT
   * Nếu bất kỳ bước nào lỗi → ROLLBACK toàn bộ.
   */
  async createWithDetails(
    payroll: Partial<PayrollEntity>,
    details: Partial<PayrollSessionDetail>[],
  ): Promise<PayrollEntity> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // 1. Insert payroll header
      const payrollRes = await client.query(
        `INSERT INTO payroll_records (
           payroll_code, teacher_id, period_month, period_year,
           sessions_count, salary_per_session_snapshot, allowance_snapshot,
           total_salary, finalized_by, finalized_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
         )
         RETURNING *`,
        [
          payroll.payrollCode,
          payroll.teacherId,
          payroll.periodMonth,
          payroll.periodYear,
          payroll.sessionsCount,
          payroll.salaryPerSessionSnapshot,
          payroll.allowanceSnapshot,
          payroll.totalSalary,
          payroll.finalizedBy,
          payroll.finalizedAt ?? new Date(),
        ],
      );

      const createdPayroll = this.mapToEntity(payrollRes.rows[0]);
      const payrollId = createdPayroll.id;

      // 2. Bulk-insert session details (nếu có)
      if (details.length > 0) {
        const valuePlaceholders = details
          .map((_, i) => {
            const base = i * 5;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
          })
          .join(', ');

        const detailParams: any[] = [];
        for (const d of details) {
          detailParams.push(
            payrollId,
            d.sessionId,
            d.sessionDate,
            d.classCode,
            d.wasCover ?? false,
          );
        }

        await client.query(
          `INSERT INTO payroll_session_details
             (payroll_id, session_id, session_date, class_code, was_cover)
           VALUES ${valuePlaceholders}`,
          detailParams,
        );
      }

      await client.query('COMMIT');
      return createdPayroll;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

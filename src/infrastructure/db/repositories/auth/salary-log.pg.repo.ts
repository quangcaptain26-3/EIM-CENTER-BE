import type { Pool, PoolClient } from 'pg';
import { ISalaryLogRepo } from '../../../../domain/auth/repositories/salary-log.repo.port';

export class SalaryLogPgRepo implements ISalaryLogRepo {
  constructor(private readonly pool: Pool | PoolClient) {}

  async create(data: {
    userId: string;
    oldSalaryPerSession: number | null;
    newSalaryPerSession: number | null;
    oldAllowance: number | null;
    newAllowance: number | null;
    changedBy: string;
    reason: string;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO salary_change_logs (
        user_id, old_salary_per_session, new_salary_per_session,
        old_allowance, new_allowance, changed_by, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.userId,
        data.oldSalaryPerSession ?? null,
        data.newSalaryPerSession ?? null,
        data.oldAllowance ?? null,
        data.newAllowance ?? null,
        data.changedBy,
        data.reason,
      ]
    );
  }

  async getRecentLogs(userId: string, limit: number): Promise<any[]> {
    const res = await this.pool.query(
      `SELECT 
        old_salary_per_session AS "oldSalaryPerSession",
        new_salary_per_session AS "newSalaryPerSession",
        old_allowance AS "oldAllowance",
        new_allowance AS "newAllowance",
        reason,
        changed_at AS "changedAt"
       FROM salary_change_logs
       WHERE user_id = $1
       ORDER BY changed_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return res.rows;
  }
}

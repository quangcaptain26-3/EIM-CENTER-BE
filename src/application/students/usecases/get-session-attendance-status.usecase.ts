import type { Pool } from 'pg';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class GetSessionAttendanceStatusUseCase {
  constructor(private readonly db: Pick<Pool, 'query'>) {}

  async execute(sessionId: string) {
    const res = await this.db.query(
      `SELECT s.submitted_at, u.user_code AS submitted_by_code, u.full_name AS submitted_by_name
       FROM sessions s
       LEFT JOIN users u ON u.id = s.submitted_by
       WHERE s.id = $1`,
      [sessionId],
    );
    const row = res.rows[0];
    if (!row) {
      throw new AppError(ERROR_CODES.SESSION_NOT_FOUND, 'Không tìm thấy buổi học', 404);
    }
    return {
      locked: Boolean(row.submitted_at),
      submittedAt: row.submitted_at ?? null,
      submittedBy: row.submitted_by_name ?? null,
      submittedByCode: row.submitted_by_code ?? null,
    };
  }
}

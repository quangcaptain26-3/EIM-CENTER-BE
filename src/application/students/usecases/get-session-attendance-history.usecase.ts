import type { Pool } from 'pg';

export class GetSessionAttendanceHistoryUseCase {
  constructor(private readonly db: Pick<Pool, 'query'>) {}

  async execute(sessionId: string) {
    const res = await this.db.query(
      `SELECT id, action, actor_code AS "actorCode", actor_role AS "actorRole",
              metadata, description, event_time AS "createdAt"
       FROM audit_logs
       WHERE entity_type = 'session'
         AND entity_id = $1
         AND action IN ('ATTENDANCE:recorded', 'ATTENDANCE:edited')
       ORDER BY event_time DESC`,
      [sessionId],
    );
    return { data: res.rows };
  }
}

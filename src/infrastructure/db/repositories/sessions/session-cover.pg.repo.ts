import { ISessionCoverRepo } from '../../../../domain/sessions/repositories/session.repo.port';
import { SessionCoverEntity } from '../../../../domain/sessions/entities/session.entity';

export class SessionCoverPgRepo implements ISessionCoverRepo {
  constructor(private readonly db: any) {}

  async findBySession(sessionId: string): Promise<SessionCoverEntity | null> {
    const res = await this.db.query(
      `SELECT * FROM session_covers WHERE session_id = $1 AND status <> 'cancelled' ORDER BY assigned_at DESC LIMIT 1`,
      [sessionId],
    );
    if (!res.rows[0]) return null;
    return SessionCoverPgRepo.rowToCoverEntity(res.rows[0]);
  }

  /** All TEACHER users except GV chính của buổi; mỗi dòng có isAvailable + conflictReason. */
  async findAvailableTeachers(sessionId: string): Promise<any[]> {
    const res = await this.db.query(
      `
      WITH target AS (
        SELECT
          s.id AS sid,
          s.session_date::date AS d,
          s.shift::int AS shift_num,
          s.teacher_id AS main_teacher_id
        FROM sessions s
        WHERE s.id = $1
      ),
      candidates AS (
        SELECT u.id, u.full_name, u.user_code
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        CROSS JOIN target t
        WHERE r.code = 'TEACHER' AND u.is_active = true AND u.id <> t.main_teacher_id
      ),
      conflict_main AS (
        SELECT DISTINCT ON (s.teacher_id)
          s.teacher_id AS uid,
          c.class_code,
          s.shift::int AS shift
        FROM sessions s
        INNER JOIN classes c ON c.id = s.class_id
        CROSS JOIN target t
        WHERE s.session_date::date = t.d
          AND s.shift::int = t.shift_num
          AND s.status <> 'cancelled'
          AND s.id <> t.sid
        ORDER BY s.teacher_id, c.class_code
      ),
      conflict_cover AS (
        SELECT DISTINCT ON (sc.cover_teacher_id)
          sc.cover_teacher_id AS uid,
          c.class_code,
          s.shift::int AS shift
        FROM session_covers sc
        INNER JOIN sessions s ON s.id = sc.session_id
        INNER JOIN classes c ON c.id = s.class_id
        CROSS JOIN target t
        WHERE s.session_date::date = t.d
          AND s.shift::int = t.shift_num
          AND sc.status <> 'cancelled'
        ORDER BY sc.cover_teacher_id, c.class_code
      )
      SELECT
        c.id AS user_id,
        c.full_name AS full_name,
        c.user_code AS user_code,
        (cm.uid IS NULL AND cc.uid IS NULL) AS is_available,
        CASE
          WHEN cm.uid IS NOT NULL THEN
            'Trùng lịch: Đang dạy lớp ' || cm.class_code || ' Ca ' || cm.shift
          WHEN cc.uid IS NOT NULL THEN
            'Trùng lịch: Đang cover lớp ' || cc.class_code || ' Ca ' || cc.shift
          ELSE NULL
        END AS conflict_reason
      FROM candidates c
      LEFT JOIN conflict_main cm ON cm.uid = c.id
      LEFT JOIN conflict_cover cc ON cc.uid = c.id AND cm.uid IS NULL
      ORDER BY c.full_name ASC
    `,
      [sessionId],
    );

    return res.rows.map((row: Record<string, unknown>) => ({
      userId: row.user_id as string,
      fullName: row.full_name as string,
      userCode: row.user_code as string,
      isAvailable: row.is_available as boolean,
      conflictReason: (row.conflict_reason as string | null) ?? null,
    }));
  }

  /** Buổi mà GV này đang làm cover trong tháng/năm (roleType cover trên FE). */
  async findCoversByTeacher(teacherId: string, month: number, year: number): Promise<any[]> {
    const res = await this.db.query(
      `
      SELECT
        s.id AS session_id,
        s.class_id,
        s.session_date,
        s.shift,
        s.status,
        c.class_code,
        sc.cover_teacher_id,
        sc.status AS cover_status,
        sc.reason AS cover_reason
      FROM session_covers sc
      INNER JOIN sessions s ON s.id = sc.session_id
      INNER JOIN classes c ON c.id = s.class_id
      WHERE sc.cover_teacher_id = $1
        AND sc.status <> 'cancelled'
        AND EXTRACT(MONTH FROM s.session_date::date) = $2::int
        AND EXTRACT(YEAR FROM s.session_date::date) = $3::int
      ORDER BY s.session_date ASC, s.shift ASC
    `,
      [teacherId, month, year],
    );
    return res.rows;
  }

  private static rowToCoverEntity(row: Record<string, unknown>): SessionCoverEntity {
    return new SessionCoverEntity({
      id: (row.session_id ?? row.id) as string,
      sessionId: row.session_id as string,
      coverTeacherId: row.cover_teacher_id as string,
      reason: row.reason as string,
      status: row.status as SessionCoverEntity['status'],
      assignedBy: row.assigned_by as string,
      createdAt: (row.assigned_at as Date) ?? new Date(),
    });
  }

  async create(data: Partial<SessionCoverEntity>): Promise<SessionCoverEntity> {
    const res = await this.db.query(
      `INSERT INTO session_covers (session_id, cover_teacher_id, reason, status, assigned_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.sessionId, data.coverTeacherId, data.reason, data.status || 'pending', data.assignedBy],
    );
    return SessionCoverPgRepo.rowToCoverEntity(res.rows[0]);
  }

  async updateStatus(sessionId: string, status: string): Promise<boolean> {
    const res = await this.db.query(`UPDATE session_covers SET status = $1 WHERE session_id = $2`, [
      status,
      sessionId,
    ]);
    return res.rowCount > 0;
  }
}

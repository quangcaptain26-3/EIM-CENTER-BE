import {
  ISessionRepo,
  SessionDbExecutor,
} from '../../../../domain/sessions/repositories/session.repo.port';
import { SessionEntity } from '../../../../domain/sessions/entities/session.entity';

export class SessionPgRepo implements ISessionRepo {
  constructor(private readonly db: SessionDbExecutor) {}

  async findById(id: string): Promise<SessionEntity | null> {
    const res = await this.db.query(`SELECT * FROM sessions WHERE id = $1`, [id]);
    if (!res.rows[0]) return null;
    return new SessionEntity(res.rows[0]);
  }

  async findByClass(classId: string): Promise<SessionEntity[]> {
    const res = await this.db.query(`SELECT * FROM sessions WHERE class_id = $1 ORDER BY session_no ASC`, [classId]);
    return res.rows.map((r: any) => new SessionEntity(r));
  }

  async findByTeacher(teacherId: string, month: number, year: number): Promise<SessionEntity[]> {
    const res = await this.db.query(
      `SELECT * FROM sessions WHERE teacher_id = $1 
       AND EXTRACT(MONTH FROM session_date) = $2
       AND EXTRACT(YEAR FROM session_date) = $3
       ORDER BY session_date ASC`,
      [teacherId, month, year]
    );
    return res.rows.map((r: any) => new SessionEntity(r));
  }

  async bulkCreate(sessions: Partial<SessionEntity>[]): Promise<SessionEntity[]> {
    if (!sessions.length) return [];
    
    // Parameterized bulk insert
    const placeholders = sessions.map((_, i) => 
      `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`
    ).join(', ');
    
    const values: any[] = [];
    sessions.forEach(s => {
      values.push(s.classId, s.teacherId, s.sessionNo, s.sessionDate, s.shift, s.status);
    });

    const query = `
      INSERT INTO sessions (class_id, teacher_id, session_no, session_date, shift, status)
      VALUES ${placeholders}
      RETURNING *
    `;
    
    const res = await this.db.query(query, values);
    return res.rows.map((r: any) => new SessionEntity(r));
  }

  async update(id: string, data: any): Promise<SessionEntity> {
    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        // Convert camelCase mapping safely
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        sets.push(`${snakeKey} = $${i}`);
        values.push(value);
        i++;
      }
    }

    if (sets.length === 0) throw new Error('No data to update');

    values.push(id);
    const query = `UPDATE sessions SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`;
    const res = await this.db.query(query, values);
    return new SessionEntity(res.rows[0] as Partial<SessionEntity>);
  }

  async findLastSessionOfEnrollment(enrollmentId: string): Promise<SessionEntity | null> {
    const res = await this.db.query(
      `
      SELECT s.*
      FROM sessions s
      INNER JOIN enrollments e ON e.class_id = s.class_id AND e.id = $1
      WHERE s.session_no = 24
      LIMIT 1
      `,
      [enrollmentId],
    );
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return new SessionEntity({
      id: row.id as string,
      classId: row.class_id as string,
      teacherId: row.teacher_id as string,
      sessionNo: Number(row.session_no),
      sessionDate: row.session_date as Date,
      shift: row.shift as 1 | 2,
      status: row.status as 'pending' | 'completed' | 'cancelled',
      sessionNote: row.session_note as string | undefined,
      originalDate: row.original_date as Date | undefined,
      rescheduleReason: row.reschedule_reason as string | undefined,
      rescheduledBy: row.rescheduled_by as string | undefined,
      createdAt: row.created_at as Date,
    });
  }

  async getFirstPendingSessionNo(classId: string, executor: SessionDbExecutor = this.db): Promise<number | null> {
    const res = await executor.query(
      `SELECT MIN(session_no) AS m FROM sessions WHERE class_id = $1 AND status = 'pending'`,
      [classId],
    );
    const row = res.rows[0] as { m?: number | string | null } | undefined;
    const m = row?.m;
    if (m === null || m === undefined) return null;
    return typeof m === 'number' ? m : parseInt(String(m), 10);
  }

  async updateTeacherFromSession(
    classId: string,
    fromSessionNo: number,
    newTeacherId: string,
    executor: SessionDbExecutor = this.db,
  ): Promise<void> {
    await executor.query(
      `UPDATE sessions SET teacher_id = $3 WHERE class_id = $1 AND session_no >= $2 AND status = 'pending'`,
      [classId, fromSessionNo, newTeacherId],
    );
  }
}

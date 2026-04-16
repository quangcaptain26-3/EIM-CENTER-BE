import {
  AttendanceHistoryJoinRow,
  IAttendanceRepo,
  SessionAttendanceDetailRow,
} from '../../../../domain/students/repositories/attendance.repo.port';
import { AttendanceEntity, AttendanceStatus } from '../../../../domain/students/entities/attendance.entity';

export class AttendancePgRepo implements IAttendanceRepo {
  constructor(private readonly db: any) {}

  private mapToEntity(row: any): AttendanceEntity {
    return new AttendanceEntity(
      row.id,
      row.session_id,
      row.student_id,
      row.enrollment_id,
      row.status as AttendanceStatus,
      row.note ?? undefined,
      row.recorded_by ?? undefined,
      row.created_at,
      row.updated_at,
    );
  }

  async findById(id: string): Promise<AttendanceEntity | null> {
    const res = await this.db.query(
      `SELECT * FROM attendance WHERE id = $1`,
      [id],
    );
    if (!res.rows[0]) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async findBySession(sessionId: string): Promise<AttendanceEntity[]> {
    const res = await this.db.query(
      `SELECT * FROM attendance WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId],
    );
    return res.rows.map((r: any) => this.mapToEntity(r));
  }

  async findDetailRowsBySession(sessionId: string): Promise<SessionAttendanceDetailRow[]> {
    const res = await this.db.query(
      `SELECT a.enrollment_id, a.student_id, a.status, a.note,
              s.full_name AS student_name, s.student_code
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       WHERE a.session_id = $1
       ORDER BY s.full_name ASC`,
      [sessionId],
    );
    return res.rows.map((row: any) => ({
      enrollmentId: row.enrollment_id,
      studentId: row.student_id,
      studentName: row.student_name,
      studentCode: row.student_code ?? null,
      status: row.status ?? null,
      note: row.note ?? null,
    }));
  }

  async findByEnrollment(enrollmentId: string): Promise<AttendanceEntity[]> {
    const res = await this.db.query(
      `SELECT * FROM attendance WHERE enrollment_id = $1 ORDER BY created_at ASC`,
      [enrollmentId],
    );
    return res.rows.map((r: any) => this.mapToEntity(r));
  }

  async findHistoryByEnrollment(enrollmentId: string): Promise<AttendanceHistoryJoinRow[]> {
    const res = await this.db.query(
      `SELECT
         a.id,
         a.session_id AS "sessionId",
         a.enrollment_id AS "enrollmentId",
         a.student_id AS "studentId",
         a.status,
         a.note,
         s.session_no AS "sessionNo",
         s.session_date AS "sessionDate",
         s.shift
       FROM attendance a
       INNER JOIN sessions s ON s.id = a.session_id
       WHERE a.enrollment_id = $1
       ORDER BY s.session_date ASC, s.session_no ASC`,
      [enrollmentId],
    );
    return res.rows.map((r: any) => {
      const d = r.sessionDate;
      const sessionDate =
        d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? '').slice(0, 10);
      return {
        id: String(r.id),
        sessionId: String(r.sessionId),
        enrollmentId: String(r.enrollmentId),
        studentId: String(r.studentId),
        status: r.status,
        note: r.note ?? null,
        sessionNo: Number(r.sessionNo),
        sessionDate,
        shift: Number(r.shift),
      };
    });
  }

  /**
   * INSERT ... ON CONFLICT (session_id, student_id) DO UPDATE
   * Cho phép điểm danh lại (overwrite) nếu đã có record cho cùng session + student.
   */
  async upsert(data: {
    sessionId: string;
    studentId: string;
    enrollmentId: string;
    status: AttendanceStatus;
    note?: string;
    recordedBy?: string;
  }): Promise<AttendanceEntity> {
    const res = await this.db.query(
      `INSERT INTO attendance (session_id, student_id, enrollment_id, status, note, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (session_id, student_id)
       DO UPDATE SET
         status      = EXCLUDED.status,
         note        = EXCLUDED.note,
         recorded_by = EXCLUDED.recorded_by,
         updated_at  = NOW()
       RETURNING *`,
      [
        data.sessionId,
        data.studentId,
        data.enrollmentId,
        data.status,
        data.note ?? null,
        data.recordedBy ?? null,
      ],
    );
    return this.mapToEntity(res.rows[0]);
  }
}

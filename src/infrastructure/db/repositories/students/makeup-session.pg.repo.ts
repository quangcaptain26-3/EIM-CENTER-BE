import {
  IMakeupSessionRepo,
  CreateMakeupSessionRecord,
  MakeupSessionListItem,
} from '../../../../domain/students/repositories/attendance.repo.port';
import { MakeupSessionEntity, MakeupSessionStatus } from '../../../../domain/students/entities/makeup-session.entity';

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toIsoDateOnly(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

const MAKEUP_LIST_SELECT = `
  SELECT
    ms.id,
    ms.makeup_code,
    ms.enrollment_id,
    ms.student_id,
    ms.status,
    ms.makeup_date,
    ms.shift,
    ms.room_id,
    ms.teacher_id,
    orig.session_no AS original_session_no,
    orig.session_date AS original_date,
    rm.room_code AS room_name,
    u.full_name AS teacher_name,
    st.full_name AS student_name,
    st.student_code
  FROM makeup_sessions ms
  INNER JOIN sessions orig ON orig.id = ms.original_session_id
  LEFT JOIN rooms rm ON rm.id = ms.room_id
  LEFT JOIN users u ON u.id = ms.teacher_id AND u.deleted_at IS NULL
  LEFT JOIN students st ON st.id = ms.student_id AND st.deleted_at IS NULL
`;

export class MakeupSessionPgRepo implements IMakeupSessionRepo {
  constructor(private readonly db: any) {}

  private mapToEntity(row: Record<string, unknown>): MakeupSessionEntity {
    return new MakeupSessionEntity(
      String(row.id),
      String(row.makeup_code),
      String(row.original_attendance_id ?? row.attendance_id),
      String(row.enrollment_id),
      row.makeup_date instanceof Date ? row.makeup_date : new Date(String(row.makeup_date)),
      Number(row.shift) as 1 | 2,
      String(row.room_id),
      String(row.teacher_id),
      row.status as MakeupSessionStatus,
      row.created_at instanceof Date ? row.created_at : row.created_at ? new Date(String(row.created_at)) : undefined,
      undefined,
    );
  }

  async findById(id: string): Promise<MakeupSessionEntity | null> {
    const res = await this.db.query(`SELECT * FROM makeup_sessions WHERE id = $1`, [id]);
    if (!res.rows[0]) return null;
    return this.mapToEntity(res.rows[0]);
  }

  private mapToListItem(row: Record<string, unknown>): MakeupSessionListItem {
    const code = String(row.makeup_code ?? '');
    return {
      id: String(row.id),
      code,
      makeupCode: code,
      enrollmentId: String(row.enrollment_id),
      studentId: String(row.student_id),
      studentName: row.student_name != null ? String(row.student_name) : null,
      studentCode: row.student_code != null ? String(row.student_code) : null,
      originalSessionNo: row.original_session_no != null ? Number(row.original_session_no) : null,
      originalDate: toIsoDateOnly(row.original_date),
      scheduledDate: toIsoDateOnly(row.makeup_date) ?? '',
      status: row.status as MakeupSessionStatus,
      roomId: String(row.room_id),
      roomName: row.room_name != null ? String(row.room_name) : null,
      teacherId: String(row.teacher_id),
      teacherName: row.teacher_name != null ? String(row.teacher_name) : null,
      shift: Number(row.shift) as 1 | 2,
    };
  }

  async findMany(filter?: {
    enrollmentId?: string;
    status?: MakeupSessionStatus;
  }): Promise<MakeupSessionListItem[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let pi = 1;

    if (filter?.enrollmentId) {
      conditions.push(`ms.enrollment_id = $${pi}`);
      values.push(filter.enrollmentId);
      pi++;
    }
    if (filter?.status) {
      conditions.push(`ms.status = $${pi}`);
      values.push(filter.status);
      pi++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const res = await this.db.query(
      `${MAKEUP_LIST_SELECT} ${where} ORDER BY ms.makeup_date ASC`,
      values,
    );
    return res.rows.map((r: Record<string, unknown>) => this.mapToListItem(r));
  }

  async findByAttendance(attendanceId: string): Promise<MakeupSessionEntity | null> {
    const res = await this.db.query(
      `SELECT * FROM makeup_sessions WHERE original_attendance_id = $1 LIMIT 1`,
      [attendanceId],
    );
    if (!res.rows[0]) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async create(data: CreateMakeupSessionRecord): Promise<MakeupSessionEntity> {
    const res = await this.db.query(
      `INSERT INTO makeup_sessions (
         makeup_code, original_session_id, original_attendance_id, student_id, enrollment_id,
         makeup_date, shift, room_id, teacher_id, status, note, created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.makeupCode,
        data.originalSessionId,
        data.attendanceId,
        data.studentId,
        data.enrollmentId,
        toDateOnly(data.makeupDate),
        data.shift,
        data.roomId,
        data.teacherId,
        data.status ?? 'pending',
        data.note ?? null,
        data.createdBy,
      ],
    );
    return this.mapToEntity(res.rows[0]);
  }

  async updateStatus(id: string, status: MakeupSessionStatus): Promise<void> {
    await this.db.query(`UPDATE makeup_sessions SET status = $1 WHERE id = $2`, [status, id]);
  }
}

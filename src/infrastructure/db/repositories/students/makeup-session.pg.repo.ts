import { IMakeupSessionRepo } from '../../../../domain/students/repositories/attendance.repo.port';
import { MakeupSessionEntity, MakeupSessionStatus } from '../../../../domain/students/entities/makeup-session.entity';

export class MakeupSessionPgRepo implements IMakeupSessionRepo {
  constructor(private readonly db: any) {}

  private mapToEntity(row: any): MakeupSessionEntity {
    return new MakeupSessionEntity(
      row.id,
      row.makeup_code,
      row.attendance_id,
      row.enrollment_id,
      row.makeup_date,
      row.shift as 1 | 2,
      row.room_id,
      row.teacher_id,
      row.status as MakeupSessionStatus,
      row.created_at,
      row.updated_at,
    );
  }

  async findById(id: string): Promise<MakeupSessionEntity | null> {
    const res = await this.db.query(
      `SELECT * FROM makeup_sessions WHERE id = $1`,
      [id],
    );
    if (!res.rows[0]) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async findByEnrollment(enrollmentId: string): Promise<MakeupSessionEntity[]> {
    const res = await this.db.query(
      `SELECT * FROM makeup_sessions WHERE enrollment_id = $1 ORDER BY makeup_date ASC`,
      [enrollmentId],
    );
    return res.rows.map((r: any) => this.mapToEntity(r));
  }

  async findByAttendance(attendanceId: string): Promise<MakeupSessionEntity | null> {
    const res = await this.db.query(
      `SELECT * FROM makeup_sessions WHERE attendance_id = $1 LIMIT 1`,
      [attendanceId],
    );
    if (!res.rows[0]) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async create(data: Partial<MakeupSessionEntity>): Promise<MakeupSessionEntity> {
    const res = await this.db.query(
      `INSERT INTO makeup_sessions
         (makeup_code, attendance_id, enrollment_id, makeup_date, shift, room_id, teacher_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.makeupCode,
        data.attendanceId,
        data.enrollmentId,
        data.makeupDate,
        data.shift,
        data.roomId,
        data.teacherId,
        data.status ?? 'pending',
      ],
    );
    return this.mapToEntity(res.rows[0]);
  }

  async updateStatus(id: string, status: MakeupSessionStatus): Promise<void> {
    await this.db.query(
      `UPDATE makeup_sessions SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, id],
    );
  }
}

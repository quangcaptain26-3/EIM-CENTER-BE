import { Pool } from 'pg';

/**
 * Kiểm tra trùng lịch dựa trên sessions thực tế + lịch cố định (schedule_days) của lớp.
 */
export class ConflictCheckerService {
  constructor(private readonly db: Pool) {}

  /**
   * @returns true nếu có xung đột (GV đã có buổi học trùng ca + ngày trong tuần với lớp khác).
   */
  async checkTeacherConflict(params: {
    teacherId: string;
    scheduleDays: number[];
    shift: number;
    excludeClassId?: string;
  }): Promise<boolean> {
    const { teacherId, scheduleDays, shift, excludeClassId } = params;
    const res = await this.db.query<{ cnt: string }>(
      `
      SELECT COUNT(*)::text AS cnt
      FROM sessions s
      INNER JOIN classes c ON c.id = s.class_id
      WHERE s.teacher_id = $1
        AND s.shift = $2
        AND c.status <> 'closed'
        AND ($3::uuid IS NULL OR c.id <> $3)
        AND c.schedule_days && $4::smallint[]
        AND s.status <> 'cancelled'
      LIMIT 1
      `,
      [teacherId, shift, excludeClassId ?? null, scheduleDays],
    );
    const n = parseInt(res.rows[0]?.cnt ?? '0', 10);
    return n > 0;
  }

  /**
   * Giống checkTeacherConflict nhưng trả thêm mô tả lớp trùng (cho FE chọn GV cover).
   */
  async checkTeacherConflictWithDetail(params: {
    teacherId: string;
    scheduleDays: number[];
    shift: number;
    excludeClassId?: string;
  }): Promise<{ hasConflict: boolean; conflictReason: string | null }> {
    const hasConflict = await this.checkTeacherConflict(params);
    if (!hasConflict) {
      return { hasConflict: false, conflictReason: null };
    }
    const { teacherId, scheduleDays, shift, excludeClassId } = params;
    const detailRes = await this.db.query<{ class_code: string; shift_num: number }>(
      `
      SELECT c.class_code, s.shift::int AS shift_num
      FROM sessions s
      INNER JOIN classes c ON c.id = s.class_id
      WHERE s.teacher_id = $1
        AND s.shift = $2
        AND c.status <> 'closed'
        AND ($3::uuid IS NULL OR c.id <> $3)
        AND c.schedule_days && $4::smallint[]
        AND s.status <> 'cancelled'
      LIMIT 1
      `,
      [teacherId, shift, excludeClassId ?? null, scheduleDays],
    );
    const row = detailRes.rows[0];
    if (!row) {
      return { hasConflict: true, conflictReason: 'Trùng lịch dạy' };
    }
    return {
      hasConflict: true,
      conflictReason: `Đang dạy lớp ${row.class_code} Ca ${row.shift_num}`,
    };
  }

  /**
   * @returns true nếu phòng đã có buổi học trùng ca + ngày trong tuần với lớp khác (cùng phòng).
   */
  async checkRoomConflict(params: {
    roomId: string;
    scheduleDays: number[];
    shift: number;
    excludeClassId?: string;
  }): Promise<boolean> {
    const { roomId, scheduleDays, shift, excludeClassId } = params;
    const res = await this.db.query<{ cnt: string }>(
      `
      SELECT COUNT(*)::text AS cnt
      FROM sessions s
      INNER JOIN classes c ON c.id = s.class_id
      WHERE s.class_id IN (
        SELECT id FROM classes WHERE room_id = $1 AND status <> 'closed'
      )
        AND s.shift = $2
        AND ($3::uuid IS NULL OR c.id <> $3)
        AND c.schedule_days && $4::smallint[]
        AND s.status <> 'cancelled'
      LIMIT 1
      `,
      [roomId, shift, excludeClassId ?? null, scheduleDays],
    );
    const n = parseInt(res.rows[0]?.cnt ?? '0', 10);
    return n > 0;
  }

  /**
   * Trùng lịch theo một ngày cụ thể: phòng đã có buổi học (lớp gán phòng) hoặc buổi học bù cùng ca.
   */
  async checkRoomConflictByDate(params: {
    roomId: string;
    date: Date | string;
    shift: number;
  }): Promise<boolean> {
    const d =
      params.date instanceof Date
        ? params.date.toISOString().slice(0, 10)
        : String(params.date).slice(0, 10);

    const res = await this.db.query<{ conflict: boolean }>(
      `
      SELECT (
        EXISTS (
          SELECT 1
          FROM sessions s
          INNER JOIN classes c ON c.id = s.class_id
          WHERE c.room_id = $1
            AND s.session_date = $2::date
            AND s.shift = $3
            AND s.status <> 'cancelled'
        )
        OR EXISTS (
          SELECT 1
          FROM makeup_sessions m
          WHERE m.room_id = $1
            AND m.makeup_date = $2::date
            AND m.shift = $3
            AND m.status <> 'cancelled'
        )
      ) AS conflict
      `,
      [params.roomId, d, params.shift],
    );
    return Boolean(res.rows[0]?.conflict);
  }

  /**
   * GV đã có buổi chính, buổi cover, hoặc buổi học bù trùng ngày + ca.
   */
  async checkTeacherConflictByDate(params: {
    teacherId: string;
    date: Date | string;
    shift: number;
  }): Promise<boolean> {
    const d =
      params.date instanceof Date
        ? params.date.toISOString().slice(0, 10)
        : String(params.date).slice(0, 10);

    const res = await this.db.query<{ conflict: boolean }>(
      `
      SELECT (
        EXISTS (
          SELECT 1 FROM sessions s
          WHERE s.teacher_id = $1
            AND s.session_date = $2::date
            AND s.shift = $3
            AND s.status <> 'cancelled'
        )
        OR EXISTS (
          SELECT 1
          FROM session_covers sc
          INNER JOIN sessions s ON s.id = sc.session_id
          WHERE sc.cover_teacher_id = $1
            AND s.session_date = $2::date
            AND s.shift = $3
            AND s.status <> 'cancelled'
            AND sc.status <> 'cancelled'
        )
        OR EXISTS (
          SELECT 1 FROM makeup_sessions m
          WHERE m.teacher_id = $1
            AND m.makeup_date = $2::date
            AND m.shift = $3
            AND m.status <> 'cancelled'
        )
      ) AS conflict
      `,
      [params.teacherId, d, params.shift],
    );
    return Boolean(res.rows[0]?.conflict);
  }
}

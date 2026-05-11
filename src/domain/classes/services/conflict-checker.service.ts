import { Pool } from 'pg';

/**
 * Kiểm tra trùng lịch GV / phòng — phục vụ tạo lớp, gán cover, reschedule, học bù (Q8, Q11, Q16, Q21, Q36).
 *
 * Cách vận hành (tóm tắt theo spec EIM):
 * - **Theo lịch cố định lớp (`schedule_days` + `shift`):** `checkTeacherConflict` / `findTeacherConflictDetail`
 *   so khớp GV đang gán cho lớp `active` khác có cùng ca và giao `schedule_days` (toán tử `&&` trên PostgreSQL).
 * - **Theo một ngày cụ thể:** `checkTeacherConflictByDate*` kiểm tra 3 nguồn trùng ca+ngày: (1) `sessions.teacher_id`,
 *   (2) `session_covers.cover_teacher_id` (cover không cancelled), (3) `makeup_sessions.teacher_id` — khớp Q21/Q36
 *   (GV đang cover buổi T2 ca 1 không thể nhận thêm lịch trùng T2 ca 1).
 * - **Phòng theo ngày:** `checkRoomConflictByDate*` — session lớp hoặc makeup cùng `room_id`, ngày, ca.
 */
export class ConflictCheckerService {
  constructor(private readonly db: Pool) {}

  private shiftLabel(shift: number): string {
    return `Ca ${shift}`;
  }

  /**
   * @returns true nếu có xung đột (GV đã có buổi học trùng ca + ngày trong tuần với lớp khác).
   */
  async checkTeacherConflict(params: {
    teacherId: string;
    scheduleDays: number[];
    shift: number;
    excludeClassId?: string;
  }): Promise<boolean> {
    const detail = await this.findTeacherConflictDetail(params);
    return Boolean(detail);
  }

  async findTeacherConflictDetail(params: {
    teacherId: string;
    scheduleDays: number[];
    shift: number;
    excludeClassId?: string;
  }): Promise<{ classCode: string; shift: number } | null> {
    const { teacherId, scheduleDays, shift, excludeClassId } = params;
    const res = await this.db.query<{ class_code: string; shift: number }>(
      `
      SELECT c.class_code, c.shift
      FROM classes c
      INNER JOIN class_staff cs
        ON cs.class_id = c.id
       AND cs.effective_to_session IS NULL
      WHERE cs.teacher_id = $1
        AND c.shift = $2
        AND c.status = 'active'
        AND ($3::uuid IS NULL OR c.id <> $3)
        AND c.schedule_days && $4::smallint[]
      LIMIT 1
      `,
      [teacherId, shift, excludeClassId ?? null, scheduleDays],
    );
    const row = res.rows[0];
    if (!row) return null;
    return { classCode: row.class_code, shift: Number(row.shift) };
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
    const detail = await this.findTeacherConflictDetail(params);
    if (!detail) {
      return { hasConflict: false, conflictReason: null };
    }
    return {
      hasConflict: true,
      conflictReason: `Đang dạy lớp ${detail.classCode} ${this.shiftLabel(detail.shift)}`,
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
    const detail = await this.findRoomConflictDetail(params);
    return Boolean(detail);
  }

  async findRoomConflictDetail(params: {
    roomId: string;
    scheduleDays: number[];
    shift: number;
    excludeClassId?: string;
  }): Promise<{ classCode: string; roomCode: string | null; shift: number } | null> {
    const { roomId, scheduleDays, shift, excludeClassId } = params;
    const res = await this.db.query<{ class_code: string; room_code: string | null; shift: number }>(
      `
      SELECT c.class_code, r.room_code, c.shift
      FROM classes c
      INNER JOIN rooms r ON r.id = c.room_id
      WHERE c.room_id = $1
        AND c.shift = $2
        AND c.status = 'active'
        AND ($3::uuid IS NULL OR c.id <> $3)
        AND c.schedule_days && $4::smallint[]
      LIMIT 1
      `,
      [roomId, shift, excludeClassId ?? null, scheduleDays],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      classCode: row.class_code,
      roomCode: row.room_code ?? null,
      shift: Number(row.shift),
    };
  }

  /**
   * Trùng lịch theo một ngày cụ thể: phòng đã có buổi học (lớp gán phòng) hoặc buổi học bù cùng ca.
   */
  async checkRoomConflictByDate(params: {
    roomId: string;
    date: Date | string;
    shift: number;
  }): Promise<boolean> {
    const d = this.normalizeDateOnly(params.date);
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
   * Giống checkRoomConflictByDate nhưng trả lý do — dùng FE kiểm tra học bù realtime.
   * Muốn đổi rule trùng phòng/ngày/ca: sửa SQL này và check tương ứng trong CreateMakeupSessionUseCase + DB (nếu có).
   */
  async checkRoomConflictByDateWithDetail(params: {
    roomId: string;
    date: Date | string;
    shift: number;
  }): Promise<{ hasConflict: boolean; conflictReason: string | null }> {
    const d = this.normalizeDateOnly(params.date);
    const sess = await this.db.query<{ class_code: string }>(
      `
      SELECT c.class_code
      FROM sessions s
      INNER JOIN classes c ON c.id = s.class_id
      WHERE c.room_id = $1
        AND s.session_date = $2::date
        AND s.shift = $3
        AND s.status <> 'cancelled'
      LIMIT 1
      `,
      [params.roomId, d, params.shift],
    );
    if (sess.rows[0]) {
      return {
        hasConflict: true,
        conflictReason: `Phòng đang có buổi lớp ${sess.rows[0].class_code} ${this.shiftLabel(params.shift)}`,
      };
    }
    const mu = await this.db.query<{ makeup_code: string }>(
      `
      SELECT m.makeup_code
      FROM makeup_sessions m
      WHERE m.room_id = $1
        AND m.makeup_date = $2::date
        AND m.shift = $3
        AND m.status <> 'cancelled'
      LIMIT 1
      `,
      [params.roomId, d, params.shift],
    );
    if (mu.rows[0]) {
      return {
        hasConflict: true,
        conflictReason: `Phòng đang có lịch học bù (${mu.rows[0].makeup_code}) ${this.shiftLabel(params.shift)}`,
      };
    }
    return { hasConflict: false, conflictReason: null };
  }

  private normalizeDateOnly(date: Date | string): string {
    return date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10);
  }

  /**
   * GV đã có buổi chính, buổi cover, hoặc buổi học bù trùng ngày + ca.
   */
  async checkTeacherConflictByDate(params: {
    teacherId: string;
    date: Date | string;
    shift: number;
  }): Promise<boolean> {
    const detail = await this.checkTeacherConflictByDateWithDetail(params);
    return detail.hasConflict;
  }

  async checkTeacherConflictByDateWithDetail(params: {
    teacherId: string;
    date: Date | string;
    shift: number;
  }): Promise<{ hasConflict: boolean; conflictReason: string | null }> {
    const d = this.normalizeDateOnly(params.date);

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
    if (!res.rows[0]?.conflict) {
      return { hasConflict: false, conflictReason: null };
    }

    const detail = await this.db.query<{ class_code: string | null; source: string; shift: number }>(
      `
      SELECT c.class_code, 'session'::text AS source, s.shift
      FROM sessions s
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.teacher_id = $1
        AND s.session_date = $2::date
        AND s.shift = $3
        AND s.status <> 'cancelled'
      LIMIT 1
      `,
      [params.teacherId, d, params.shift],
    );
    const row = detail.rows[0];
    if (row) {
      return {
        hasConflict: true,
        conflictReason: `Đang dạy lớp ${row.class_code ?? 'khác'} ${this.shiftLabel(Number(row.shift))}`,
      };
    }

    return { hasConflict: true, conflictReason: 'Trùng lịch dạy' };
  }
}

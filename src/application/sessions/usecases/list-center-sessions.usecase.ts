/**
 * Lịch buổi học toàn trung tâm — ADMIN / Học vụ (OVERVIEW §7.3).
 * Khác `ListTeacherSessionsUseCase` (chỉ GV đăng nhập): gom mọi buổi trong tháng, lọc theo GV/lớp tuỳ chọn.
 */
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

function shiftLabel(shift: number): string {
  if (shift === 1) return 'Ca 1 (18:00–19:30)';
  if (shift === 2) return 'Ca 2 (19:30–21:00)';
  return `Ca ${shift}`;
}

export interface ListCenterSessionsFilter {
  month: number;
  year: number;
  teacherId?: string;
  classId?: string;
}

export class ListCenterSessionsUseCase {
  constructor(private readonly db: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) {}

  async execute(filter: ListCenterSessionsFilter) {
    const { month, year, teacherId, classId } = filter;
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Tháng/năm không hợp lệ', 400);
    }

    const params: unknown[] = [month, year];
    const conditions: string[] = [
      `EXTRACT(MONTH FROM s.session_date::date) = $1`,
      `EXTRACT(YEAR FROM s.session_date::date) = $2`,
    ];
    let pi = 3;

    if (teacherId) {
      conditions.push(
        `(s.teacher_id = $${pi} OR EXISTS (
          SELECT 1 FROM session_covers scf
          WHERE scf.session_id = s.id AND scf.cover_teacher_id = $${pi} AND scf.status <> 'cancelled'
        ))`,
      );
      params.push(teacherId);
      pi++;
    }

    if (classId) {
      conditions.push(`s.class_id = $${pi}`);
      params.push(classId);
      pi++;
    }

    const res = await this.db.query(
      `
      SELECT
        s.id,
        s.session_date,
        s.class_id,
        c.class_code,
        r.room_code,
        s.shift,
        s.status,
        s.submitted_at,
        s.teacher_id AS main_teacher_id,
        u_main.full_name AS main_teacher_name,
        sc.cover_teacher_id,
        u_cover.full_name AS cover_teacher_name,
        sc.status AS cover_status
      FROM sessions s
      INNER JOIN classes c ON c.id = s.class_id
      LEFT JOIN rooms r ON r.id = c.room_id
      INNER JOIN users u_main ON u_main.id = s.teacher_id
      LEFT JOIN session_covers sc ON sc.session_id = s.id AND sc.status <> 'cancelled'
      LEFT JOIN users u_cover ON u_cover.id = sc.cover_teacher_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.session_date ASC, s.shift ASC, c.class_code ASC
      `,
      params,
    );

    const todayYmd = new Date().toISOString().slice(0, 10);

    const sessions = (res.rows as Record<string, unknown>[]).map((row) => {
      const scheduledDate =
        row.session_date instanceof Date
          ? row.session_date.toISOString().slice(0, 10)
          : String(row.session_date).slice(0, 10);
      const hasCover =
        row.cover_teacher_id != null && row.cover_status != null && row.cover_status !== 'cancelled';
      const coverTeacherName = hasCover ? String(row.cover_teacher_name ?? '') : null;
      const mainTeacherName = String(row.main_teacher_name ?? '');
      const mainTeacherId = String(row.main_teacher_id ?? '');

      let roleType: 'main' | 'cover' = 'main';
      if (teacherId && hasCover && String(row.cover_teacher_id) === teacherId) {
        roleType = 'cover';
      }

      const displayTeacher = hasCover && coverTeacherName ? coverTeacherName : mainTeacherName;

      return {
        id: String(row.id),
        scheduledDate,
        classId: String(row.class_id),
        classCode: row.class_code != null ? String(row.class_code) : undefined,
        roomCode: row.room_code != null ? String(row.room_code) : undefined,
        shiftLabel: shiftLabel(Number(row.shift)),
        roleType,
        status: String(row.status),
        submittedAt: row.submitted_at ?? null,
        coverTeacherName: hasCover ? coverTeacherName : null,
        teacherName: displayTeacher,
        mainTeacherId,
        mainTeacherName,
      };
    });

    const taught = sessions.filter((x) => x.status === 'completed').length;
    const upcoming = sessions.filter(
      (x) => x.status === 'pending' && x.scheduledDate.slice(0, 10) >= todayYmd,
    ).length;
    const cover = sessions.filter((x) => x.coverTeacherName).length;

    return {
      sessions,
      summary: {
        total: sessions.length,
        totalSessions: sessions.length,
        taught,
        completed: taught,
        upcoming,
        upcomingSessions: upcoming,
        cover,
        coverSessions: cover,
      },
    };
  }
}

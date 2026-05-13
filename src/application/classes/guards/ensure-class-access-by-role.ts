import type { Pool } from 'pg';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export type ClassScopeActor = { id: string; role: string };

type DbQuery = Pick<Pool, 'query'>;

/**
 * Kiểm tra GV là giáo viên chính active của lớp (class_staff.effective_to_session IS NULL).
 * Muốn mở cho GV cover: bổ sung EXISTS session_covers / logic buổi — đồng bộ với RecordAttendanceUseCase.
 */
async function isActiveMainTeacherOfClass(db: DbQuery, classId: string, teacherUserId: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM class_staff cs
     WHERE cs.class_id = $1::uuid AND cs.teacher_id = $2::uuid AND cs.effective_to_session IS NULL
     LIMIT 1`,
    [classId, teacherUserId],
  );
  return rows.length > 0;
}

/** Roster + chi tiết lớp + danh sách buổi theo lớp (GET …/roster, GET /classes/:id, GET …/sessions) — Admin/Học vụ/Kế toán full; GV chỉ lớp chủ nhiệm active. */
export async function ensureRosterViewAccess(db: DbQuery, actor: ClassScopeActor, classId: string): Promise<void> {
  const r = String(actor.role || '').toUpperCase();
  if (r === 'ADMIN' || r === 'ACADEMIC' || r === 'ACCOUNTANT') return;
  if (r === 'TEACHER') {
    if (await isActiveMainTeacherOfClass(db, classId, actor.id)) return;
    throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Chỉ xem được danh sách lớp mình phụ trách', 403);
  }
  throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Không có quyền xem danh sách lớp', 403);
}

/**
 * Điểm danh theo lớp (ma trận, export sheet) — Admin/Học vụ; GV chỉ lớp chủ nhiệm.
 * Kế toán không vào luồng này (OVERVIEW 3.2: Kế toán không điểm danh).
 */
export async function ensureClassAttendanceScope(db: DbQuery, actor: ClassScopeActor, classId: string): Promise<void> {
  const r = String(actor.role || '').toUpperCase();
  if (r === 'ADMIN' || r === 'ACADEMIC' || r === 'ACCOUNTANT') return;
  if (r === 'TEACHER') {
    if (await isActiveMainTeacherOfClass(db, classId, actor.id)) return;
    throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Chỉ xem/ xuất điểm danh lớp mình phụ trách', 403);
  }
  throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Không có quyền thao tác điểm danh theo lớp', 403);
}

/**
 * Xuất roster Excel (có cột học phí còn lại) — Admin, Học vụ, Kế toán; GV chỉ lớp chủ nhiệm (tránh lộ học phí lớp khác).
 */
export async function ensureClassRosterExportAccess(
  db: DbQuery,
  actor: ClassScopeActor,
  classId: string,
): Promise<void> {
  const r = String(actor.role || '').toUpperCase();
  if (r === 'ADMIN' || r === 'ACADEMIC' || r === 'ACCOUNTANT') return;
  if (r === 'TEACHER') {
    if (await isActiveMainTeacherOfClass(db, classId, actor.id)) return;
    throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Chỉ xuất được roster lớp mình phụ trách', 403);
  }
  throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Không có quyền xuất roster lớp', 403);
}

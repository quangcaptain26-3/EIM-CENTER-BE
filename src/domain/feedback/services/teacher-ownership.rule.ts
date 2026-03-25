/**
 * Kiểm tra xem giáo viên có quyền GHI (submit) feedback/scores cho session hay không.
 * Chỉ check main/cover của session (teacher_effective_id) — KHÔNG dùng class_staff.
 */
export function teacherCanWriteSession(
  session: { mainTeacherId?: string | null; coverTeacherId?: string | null },
  teacherId: string
): boolean {
  if (!teacherId) return false;
  return session.mainTeacherId === teacherId || session.coverTeacherId === teacherId;
}


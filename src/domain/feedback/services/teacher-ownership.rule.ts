/**
 * Kiểm tra xem giáo viên có quyền ghi đánh giá hoặc chấm điểm cho một buổi học (session) hay không.
 * Logic: teacherId truyền vào phải khớp với mainTeacherId hoặc coverTeacherId của session đo.
 */
export function teacherCanWriteSession(
  session: { mainTeacherId?: string | null; coverTeacherId?: string | null },
  teacherId: string
): boolean {
  if (!teacherId) return false;
  return session.mainTeacherId === teacherId || session.coverTeacherId === teacherId;
}

// src/domain/sessions/services/cover-teacher.rule.ts

/**
 * Kiểm tra xem có thể gán giáo viên dạy thay (cover teacher) hay không
 */
export function canSetCoverTeacher(mainTeacherId: string | null | undefined, coverTeacherId: string): boolean {
  // TODO: Cần implement logic chi tiết các ràng buộc ở đây
  // Ví dụ quy tắc: Giáo viên dạy thay không được trùng với giáo viên chính
  if (mainTeacherId && mainTeacherId === coverTeacherId) {
    return false;
  }
  return true;
}

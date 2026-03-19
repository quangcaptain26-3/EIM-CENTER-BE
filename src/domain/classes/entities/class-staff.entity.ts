/**
 * Vai trò nhân sự ở cấp lớp (class_staff).
 *
 * Lưu ý quan trọng:
 * - TA (trợ giảng) là phụ trách lớp ở cấp class.
 * - Giáo viên dạy thay (cover teacher) là theo từng buổi học và phải lưu ở session.coverTeacherId.
 */
export type StaffType = "MAIN" | "TA";

/**
 * Giáo viên phụ trách lớp
 */
export interface ClassStaff {
  id: string; // UUID
  classId: string; // Ref: classes.id
  userId: string; // Ref: auth_users.id (Teacher)
  /** Tên hiển thị của user (join từ auth_users.full_name) */
  userFullName?: string | null;
  type: StaffType; // MAIN (Giáo viên chính) | TA (Trợ giảng)
  assignedAt: Date;
}

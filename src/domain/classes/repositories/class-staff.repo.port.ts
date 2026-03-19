import { ClassStaff, StaffType } from "../entities/class-staff.entity";

/**
 * Interface Repository cho quản lý Giáo viên của Lớp học
 */
export interface ClassStaffRepoPort {
  /**
   * Gán nhân sự phụ trách lớp (MAIN hoặc TA) vào lớp học.
   * Nếu đã tồn tại cùng role thì update AssignedAt (upsert).
   */
  assignStaff(
    classId: string,
    userId: string,
    type: StaffType
  ): Promise<ClassStaff>;

  /**
   * Lấy danh sách toàn bộ giáo viên được gán vào lớp
   */
  listStaff(classId: string): Promise<ClassStaff[]>;

  /**
   * Xóa vai trò của giáo viên khỏi lớp
   */
  removeStaff(classId: string, userId: string, type: StaffType): Promise<void>;

  /**
   * Kiểm tra xem user có phải là nhân sự giảng dạy phụ trách lớp (MAIN/TA) hay không.
   */
  isTeacherOfClass(userId: string, classId: string): Promise<boolean>;
}

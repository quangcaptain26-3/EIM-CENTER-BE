/**
 * Trạng thái của một thẻ ghi danh
 */
export type EnrollmentStatus = "ACTIVE" | "PAUSED" | "DROPPED" | "TRANSFERRED" | "GRADUATED";

/**
 * Thực thể Ghi danh (Học viên đăng ký vào Lớp học)
 */
export type Enrollment = {
  id: string;
  studentId: string;
  /**
   * ID lớp học hiện tại của enrollment.
   * Có thể null khi học viên đã ghi danh nhưng chưa được xếp lớp (đúng theo blueprint tối thiểu).
   */
  classId: string | null;
  status: EnrollmentStatus;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
};

/**
 * Thực thể Lịch sử chuyển trạng thái Ghi danh
 */
export type EnrollmentHistory = {
  id: string;
  enrollmentId: string;
  fromStatus: EnrollmentStatus;
  toStatus: EnrollmentStatus;
  note?: string;
  /**
   * Ai là người thực hiện thay đổi (userId).
   * Có thể null cho các thao tác hệ thống hoặc dữ liệu seed.
   */
  changedBy?: string | null;
  /**
   * Trace thay đổi lớp (nếu có).
   * - fromClassId/toClassId có thể null khi gán lớp lần đầu hoặc bỏ xếp lớp.
   */
  fromClassId?: string | null;
  toClassId?: string | null;
  changedAt: Date;
};

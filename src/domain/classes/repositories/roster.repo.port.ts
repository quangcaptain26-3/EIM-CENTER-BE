/**
 * Dữ liệu học viên trong lớp
 */
export interface RosterStudent {
  studentId: string;
  fullName: string;
  status: string; // Tình trạng enroll (ví dụ: 'ACTIVE')
}

/**
 * Interface Repository lấy danh sách lớp (Roster - Sĩ số)
 */
export interface RosterRepoPort {
  /**
   * Lấy danh sách học viên đang ACTIVE trong lớp học
   * Bằng cách join bảng enrollments và bảng students.
   */
  listRoster(classId: string): Promise<RosterStudent[]>;

  /**
   * Lấy danh sách học viên thuộc lớp tại một thời điểm (ngày của session).
   * Mục tiêu: chống "orphan feedback" theo nghiệp vụ (học viên phải đang enrolled vào ngày đó).
   *
   * Quy ước:
   * - start_date <= sessionDate
   * - end_date IS NULL hoặc end_date >= sessionDate
   * - status IN ('ACTIVE', 'PAUSED') (tuỳ nghiệp vụ, nhưng tối thiểu phải không bị kết thúc trước ngày đó)
   */
  listRosterAtDate(classId: string, sessionDate: Date): Promise<RosterStudent[]>;
}

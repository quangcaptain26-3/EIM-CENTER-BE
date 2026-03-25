/** Enrollment hiện tại (ACTIVE) — dùng cho search-and-pick khi thêm học viên vào lớp */
export type CurrentEnrollmentInfo = {
  classCode: string;
  programName: string | null;
};

/**
 * Thực thể Học viên
 */
export type Student = {
  id: string;
  fullName: string;
  dob?: Date;
  gender?: string;
  phone?: string;
  email?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  createdAt: Date;
  /** Lớp đang học (enrollment ACTIVE) — có khi list/search để học vụ chọn add vào lớp */
  currentEnrollment?: CurrentEnrollmentInfo | null;
};

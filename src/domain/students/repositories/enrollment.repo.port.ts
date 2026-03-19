import { Enrollment, EnrollmentStatus } from "../entities/enrollment.entity";

export type EnrollmentHistoryMeta = {
  /**
   * userId người thực hiện. Null nếu là hệ thống/anonymous.
   */
  changedBy?: string | null;
  /**
   * Lưu vết thay đổi lớp (nếu có).
   */
  fromClassId?: string | null;
  toClassId?: string | null;
};

/**
 * Interface Repository cho Ghi danh
 * Phục vụ truy xuất và thay đổi trạng thái đăng ký học
 */
export interface EnrollmentRepoPort {
  create(input: Omit<Enrollment, "id" | "createdAt">, options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } }): Promise<Enrollment>;
  findById(id: string, options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } }): Promise<Enrollment | null>;
  listByStudent(studentId: string): Promise<Enrollment[]>;
  updateStatus(enrollmentId: string, toStatus: EnrollmentStatus, note?: string): Promise<Enrollment>;
  updateClassId(enrollmentId: string, classId: string | null, options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } }): Promise<Enrollment>;
  endEnrollment(enrollmentId: string, endDate: Date, note?: string): Promise<Enrollment>;
  createHistory(
    enrollmentId: string,
    fromStatus: EnrollmentStatus,
    toStatus: EnrollmentStatus,
    note?: string,
    meta?: EnrollmentHistoryMeta,
    options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } }
  ): Promise<void>;
}

import { Enrollment, EnrollmentStatus } from "../entities/enrollment.entity";

export type EnrollmentHistoryMeta = {
  changedBy?: string | null;
  fromClassId?: string | null;
  toClassId?: string | null;
  /** unit_no, lesson_no tại thời điểm chuyển lớp (audit trail) */
  transferUnitNo?: number | null;
  transferLessonNo?: number | null;
};

/**
 * Interface Repository cho Ghi danh
 * Phục vụ truy xuất và thay đổi trạng thái đăng ký học
 */
export interface EnrollmentRepoPort {
  create(input: Omit<Enrollment, "id" | "createdAt">, options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } }): Promise<Enrollment>;
  findById(id: string, options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<any> } }): Promise<Enrollment | null>;
  listByStudent(studentId: string): Promise<Enrollment[]>;
  /** Khi chuyển sang trạng thái kết thúc (GRADUATED, DROPPED, TRANSFERRED), endDate được set nếu chưa có */
  updateStatus(enrollmentId: string, toStatus: EnrollmentStatus, note?: string, endDate?: Date): Promise<Enrollment>;
  /** Lấy danh sách enrollment theo lớp (dùng cho close class, promotion) */
  listByClassId(
    classId: string,
    statuses?: EnrollmentStatus[],
    options?: { tx?: { query: (text: string, params?: unknown[]) => Promise<unknown> } }
  ): Promise<Enrollment[]>;
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

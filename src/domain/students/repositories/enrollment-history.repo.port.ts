import { EnrollmentHistory } from "../entities/enrollment.entity";

/**
 * Interface Repository cho Lịch sử Ghi danh
 * Phục vụ truy xuất lịch sử thay đổi trạng thái của thẻ ghi danh
 */
export interface EnrollmentHistoryRepoPort {
  listByEnrollment(enrollmentId: string): Promise<EnrollmentHistory[]>;
}

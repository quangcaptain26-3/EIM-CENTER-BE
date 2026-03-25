export const EnrollmentStatuses = [
  "ACTIVE",
  "PAUSED",
  "PENDING",
  "DROPPED",
  "TRANSFERRED",
  "GRADUATED"
] as const;

/**
 * Kiểm tra tính hợp lệ của trạng thái ghi danh
 * @param status Trạng thái cần kiểm tra
 * @throws Error nếu trạng thái không hợp lệ
 */
export function assertValidEnrollmentStatus(status: any): void {
  if (!EnrollmentStatuses.includes(status)) {
    throw new Error(`Trạng thái ghi danh không hợp lệ: ${status}`);
  }
}

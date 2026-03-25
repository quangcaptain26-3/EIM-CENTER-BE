import { EnrollmentStatus } from "../entities/enrollment.entity";

/**
 * Kiểm tra xem có thể chuyển từ trạng thái hiện tại sang trạng thái mới hay không.
 * Invoice: Option A — khi PAUSED hoặc DROPPED không đụng vào invoice (giữ nguyên, xử lý thủ công).
 *
 * ACTIVE -> PAUSED/DROPPED/TRANSFERRED/GRADUATED
 * PAUSED -> ACTIVE/DROPPED/TRANSFERRED
 * PENDING -> ACTIVE/DROPPED (khi xếp lớp → ACTIVE; khi hủy → DROPPED)
 * DROPPED -> (không cho chuyển)
 * TRANSFERRED -> (không cho chuyển)
 * GRADUATED -> (không cho chuyển)
 * 
 * @param from Trạng thái hiện tại
 * @param to Trạng thái muốn chuyển đến
 * @returns boolean true nếu hợp lệ
 */
export function canTransition(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
  if (from === to) return false;

  switch (from) {
    case "ACTIVE":
      return ["PAUSED", "DROPPED", "TRANSFERRED", "GRADUATED"].includes(to);
    case "PAUSED":
      return ["ACTIVE", "DROPPED", "TRANSFERRED"].includes(to);
    case "PENDING":
      return ["ACTIVE", "DROPPED"].includes(to);
    case "DROPPED":
    case "TRANSFERRED":
    case "GRADUATED":
      return false; // Các trạng thái kết thúc không cho phép chuyển tiếp
    default:
      return false;
  }
}

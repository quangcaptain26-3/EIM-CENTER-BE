import { TrialLead } from "../entities/trial-lead.entity";

/** Tham số tối thiểu cho isConvertible — chỉ cần status */
type ConvertibleCheck = Pick<TrialLead, "status">;

/**
 * Rule chuyển đổi Trial → Student.
 * Convert-trial usecase tìm student trùng theo phone/email/guardian_phone trước khi tạo mới.
 */
export class ConvertTrialRule {
  /**
   * Kiểm tra xem khách hàng tiềm năng này có đủ điều kiện để chuyển đổi
   * thành học viên chính thức hay không.
   *
   * Quy tắc:
   * - Không được chuyển đổi nếu trạng thái đã là CONVERTED (đã chuyển đổi trước đó).
   * - Không được chuyển đổi nếu trạng thái là CLOSED (đã đóng, từ chối hoặc hết hạn).
   */
  static isConvertible(trial: ConvertibleCheck): boolean {
    if (trial.status === "CONVERTED" || trial.status === "CLOSED") {
      return false;
    }
    return true;
  }
}

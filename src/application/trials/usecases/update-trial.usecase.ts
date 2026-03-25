import { TrialRepoPort } from "../../../domain/trials/repositories/trial.repo.port";
import { UpdateTrialBody, UpdateTrialSchema } from "../dtos/trial.dto";
import { TrialsMapper } from "../mappers/trials.mapper";
import { AppError } from "../../../shared/errors/app-error";

export class UpdateTrialUseCase {
  constructor(private readonly trialRepo: TrialRepoPort) {}

  async execute(id: string, data: UpdateTrialBody) {
    const validated = UpdateTrialSchema.parse(data);

    // Khóa transition nhạy cảm: status CONVERTED chỉ được set qua endpoint Convert.
    if (validated.status === "CONVERTED") {
      throw AppError.badRequest("Không thể cập nhật status sang CONVERTED bằng endpoint cập nhật thông thường. Vui lòng dùng luồng Convert.", {
        code: "TRIAL/STATUS_CONVERTED_NOT_ALLOWED",
      });
    }

    // Kiểm tra tồn tại
    const existing = await this.trialRepo.findById(id);
    if (!existing) {
      throw AppError.notFound("Không tìm thấy TrialLead");
    }

    // Enforce lifecycle transition tối thiểu để audit journey có ý nghĩa.
    // Không cố định "đúng 100%" nghiệp vụ, nhưng chặn các nhảy cóc gây bẩn dữ liệu.
    if (validated.status) {
      const from = existing.status;
      const to = validated.status;

      const allowedNext: Record<typeof from, readonly string[]> = {
        NEW: ["CONTACTED", "SCHEDULED", "CLOSED"],
        CONTACTED: ["SCHEDULED", "CLOSED"],
        SCHEDULED: ["ATTENDED", "NO_SHOW", "CLOSED"],
        ATTENDED: ["CLOSED"], // CONVERTED đi qua endpoint convert
        NO_SHOW: ["CONTACTED", "SCHEDULED", "CLOSED"],
        CONVERTED: [], // đã chốt
        CLOSED: [], // đã chốt
      };

      // Cho phép update idempotent (ví dụ SCHEDULED -> SCHEDULED) để FE có thể gửi lại
      // payload giống trạng thái hiện tại mà không làm fail flow.
      const ok = from === to ? true : allowedNext[from]?.includes(to);
      if (!ok) {
        throw AppError.badRequest("Chuyển trạng thái TrialLead không hợp lệ theo lifecycle", {
          code: "TRIAL/INVALID_STATUS_TRANSITION",
          from,
          to,
        });
      }
    }

    const updated = await this.trialRepo.update(id, validated);
    
    // Lấy thêm schedule để response đầy đủ (nếu có)
    const schedule = await this.trialRepo.findSchedule(id);

    return TrialsMapper.toResponse(updated, schedule);
  }
}

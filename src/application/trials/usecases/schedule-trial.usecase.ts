import { TrialRepoPort } from "../../../domain/trials/repositories/trial.repo.port";
import { ScheduleTrialBody, ScheduleTrialSchema } from "../dtos/schedule.dto";

export class ScheduleTrialUseCase {
  constructor(private readonly trialRepo: TrialRepoPort) {}

  async execute(trialId: string, data: ScheduleTrialBody) {
    const validated = ScheduleTrialSchema.parse(data);

    // Kiểm tra tồn tại lead
    const existing = await this.trialRepo.findById(trialId);
    if (!existing) {
      throw new Error("TrialLead not found");
    }

    // (Tuỳ chọn: Nếu cần thiết có thể Inject ClassRepoPort để kiểm tra classId có hợp lệ hay không)
    // Thực hiện upsert: Tự động cập nhật thêm status => SCHEDULED
    const schedule = await this.trialRepo.upsertSchedule(trialId, validated.classId, validated.trialDate);

    // Lấy lại dữ liệu lead mới nhất
    const updatedLead = await this.trialRepo.findById(trialId);

    return {
      lead: updatedLead,
      schedule
    };
  }
}

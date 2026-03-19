import { TrialRepoPort } from "../../../domain/trials/repositories/trial.repo.port";
import { TrialsMapper } from "../mappers/trials.mapper";

export class GetTrialUseCase {
  constructor(private readonly trialRepo: TrialRepoPort) {}

  async execute(id: string) {
    const lead = await this.trialRepo.findById(id);
    if (!lead) {
      throw new Error("TrialLead not found"); // Có thể dùng custom Exception như NotFoundException
    }

    // Lấy thêm thông tin lịch học thử nếu có
    const schedule = await this.trialRepo.findSchedule(id);

    return TrialsMapper.toResponse(lead, schedule);
  }
}

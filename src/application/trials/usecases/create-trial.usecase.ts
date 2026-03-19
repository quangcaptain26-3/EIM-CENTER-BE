import { TrialRepoPort } from "../../../domain/trials/repositories/trial.repo.port";
import { CreateTrialBody, CreateTrialSchema } from "../dtos/trial.dto";
import { TrialsMapper } from "../mappers/trials.mapper";

export class CreateTrialUseCase {
  constructor(private readonly trialRepo: TrialRepoPort) {}

  async execute(data: CreateTrialBody, actorId?: string) {
    const validated = CreateTrialSchema.parse(data);

    const lead = await this.trialRepo.create({
      ...validated,
      createdBy: actorId, // Set id của người tạo (nhân viên) nếu có
    });

    return TrialsMapper.toResponse(lead);
  }
}

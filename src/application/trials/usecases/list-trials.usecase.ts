import { TrialRepoPort } from "../../../domain/trials/repositories/trial.repo.port";
import { ListTrialsQuery, ListTrialsSchema } from "../dtos/trial.dto";
import { TrialsMapper } from "../mappers/trials.mapper";

export class ListTrialsUseCase {
  constructor(private readonly trialRepo: TrialRepoPort) {}

  async execute(query: ListTrialsQuery) {
    // Validate payload
    const validated = ListTrialsSchema.parse(query);

    const [items, total] = await Promise.all([
      this.trialRepo.list(validated),
      this.trialRepo.count({
        search: validated.search,
        status: validated.status,
        statuses: validated.statuses,
      })
    ]);

    return {
      items: TrialsMapper.toListResponse(items),
      meta: {
        total,
        limit: validated.limit,
        offset: validated.offset
      }
    };
  }
}

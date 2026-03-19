import { FeePlanRepoPort } from "../../../domain/finance/repositories/fee-plan.repo.port";
import { mapFeePlan } from "../mappers/finance.mapper";

/**
 * UseCase: Lấy danh sách Gói học phí.
 * Có thể lọc theo programId nếu truyền vào.
 */
export class ListFeePlansUseCase {
  constructor(private readonly feePlanRepo: FeePlanRepoPort) {}

  async execute(programId?: string) {
    const plans = await this.feePlanRepo.list(programId);
    return plans.map(mapFeePlan);
  }
}

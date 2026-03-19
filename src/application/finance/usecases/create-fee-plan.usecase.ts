import { FeePlanRepoPort } from "../../../domain/finance/repositories/fee-plan.repo.port";
import { CreateFeePlanBody } from "../dtos/fee-plan.dto";
import { mapFeePlan } from "../mappers/finance.mapper";

/**
 * UseCase: Tạo mới Gói học phí.
 */
export class CreateFeePlanUseCase {
  constructor(private readonly feePlanRepo: FeePlanRepoPort) {}

  async execute(body: CreateFeePlanBody) {
    const plan = await this.feePlanRepo.create({
      programId:       body.programId,
      name:            body.name,
      amount:          body.amount,
      currency:        body.currency ?? "VND",
      sessionsPerWeek: body.sessionsPerWeek ?? 2,
    });
    return mapFeePlan(plan);
  }
}

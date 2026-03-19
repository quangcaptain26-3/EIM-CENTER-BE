import { FeePlanRepoPort } from "../../../domain/finance/repositories/fee-plan.repo.port";
import { UpdateFeePlanBody } from "../dtos/fee-plan.dto";
import { mapFeePlan } from "../mappers/finance.mapper";

/**
 * UseCase: Cập nhật thông tin Gói học phí theo ID.
 */
export class UpdateFeePlanUseCase {
  constructor(private readonly feePlanRepo: FeePlanRepoPort) {}

  async execute(id: string, body: UpdateFeePlanBody) {
    const existing = await this.feePlanRepo.findById(id);
    if (!existing) throw new Error("Không tìm thấy gói học phí");

    const updated = await this.feePlanRepo.update(id, {
      name:            body.name,
      amount:          body.amount,
      currency:        body.currency,
      sessionsPerWeek: body.sessionsPerWeek,
    });
    return mapFeePlan(updated);
  }
}

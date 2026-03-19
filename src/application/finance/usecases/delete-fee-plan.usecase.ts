import { AppError } from "../../../shared/errors/app-error";
import { FeePlanRepoPort } from "../../../domain/finance/repositories/fee-plan.repo.port";

/**
 * UseCase: Xóa gói học phí theo ID.
 * Lưu ý: Việc xóa có thể bị chặn bởi FK nếu gói học phí đang được dùng trong curriculum/invoices.
 */
export class DeleteFeePlanUseCase {
  constructor(private readonly feePlanRepo: FeePlanRepoPort) {}

  async execute(id: string) {
    const existing = await this.feePlanRepo.findById(id);
    if (!existing) {
      throw AppError.notFound("Không tìm thấy gói học phí để xóa", { feePlanId: id });
    }

    await this.feePlanRepo.delete(id);
    return { id };
  }
}


import { IRefundRequestRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { RefundRequestStatus } from '../../../domain/students/entities/refund-request.entity';

export class ListRefundRequestsUseCase {
  constructor(private readonly refundRequestRepo: IRefundRequestRepo) {}

  async execute(
    filter?: { status?: string; reasonType?: string },
    paginate?: { page: number; limit: number },
  ) {
    return this.refundRequestRepo.findAll(
      {
        status: filter?.status as RefundRequestStatus | undefined,
        reasonType: filter?.reasonType,
      },
      paginate,
    );
  }
}

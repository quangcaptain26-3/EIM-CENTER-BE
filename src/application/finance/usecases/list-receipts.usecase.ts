import { ListReceiptsDto, ListReceiptsSchema } from '../dtos/finance.dto';
import { IReceiptRepo } from '../../../domain/finance/repositories/receipt.repo.port';

export class ListReceiptsUseCase {
  constructor(private readonly receiptRepo: IReceiptRepo) {}

  async execute(dto: ListReceiptsDto) {
    const filter = ListReceiptsSchema.parse(dto);

    const result = await this.receiptRepo.findAll({
      studentId:    filter.studentId,
      enrollmentId: filter.enrollmentId,
      dateFrom:     filter.dateFrom ? new Date(filter.dateFrom) : undefined,
      dateTo:       filter.dateTo   ? new Date(filter.dateTo)   : undefined,
      page:         filter.page,
      limit:        filter.limit,
    });

    // Post-filter by paymentMethod (not in DB layer to keep repo generic)
    let data = result.data;
    if (filter.paymentMethod) {
      data = data.filter((r) => r.paymentMethod === filter.paymentMethod);
    }

    return {
      data,
      total: result.total,
      page:  filter.page,
      limit: filter.limit,
    };
  }
}

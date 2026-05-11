import { ListPayrollsDto, ListPayrollsSchema } from '../dtos/finance.dto';
import { IPayrollRepo } from '../../../domain/finance/repositories/receipt.repo.port';

export class ListPayrollsUseCase {
  constructor(private readonly payrollRepo: IPayrollRepo) {}

  async execute(dto: ListPayrollsDto) {
    const filter = ListPayrollsSchema.parse(dto);

    const result = await this.payrollRepo.findAll({
      teacherId: filter.teacherId,
      month:     filter.month,
      year:      filter.year,
      page:      filter.page,
      limit:     filter.limit,
    });

    return {
      data:  result.data,
      total: result.total,
      page:  filter.page,
      limit: filter.limit,
    };
  }
}

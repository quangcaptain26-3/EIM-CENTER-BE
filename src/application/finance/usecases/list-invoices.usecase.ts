import { InvoiceRepoPort } from "../../../domain/finance/repositories/invoice.repo.port";
import { PaymentRepoPort } from "../../../domain/finance/repositories/payment.repo.port";
import { ListInvoicesQuery } from "../dtos/invoice.dto";
import { mapInvoice } from "../mappers/finance.mapper";

/**
 * UseCase: Liệt kê hóa đơn có phân trang.
 */
export class ListInvoicesUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepoPort,
    private readonly paymentRepo: PaymentRepoPort,
  ) {}

  async execute(query: ListInvoicesQuery) {
    const [invoices, total] = await Promise.all([
      this.invoiceRepo.list({
        status:       query.status as any,
        enrollmentId: query.enrollmentId,
        overdue:      query.overdue === true,
        limit:        query.limit,
        offset:       query.offset,
      }),
      this.invoiceRepo.count({
        status:       query.status as any,
        enrollmentId: query.enrollmentId,
        overdue:      query.overdue === true,
      }),
    ]);

    const items = await Promise.all(
      invoices.map(async (inv) => {
        const [paidAmount, lastPaidAt] = await Promise.all([
          this.paymentRepo.sumPaid(inv.id),
          this.paymentRepo.getLastPaidAt(inv.id),
        ]);
        return mapInvoice(inv, { paidAmount, lastPaidAt });
      }),
    );

    return {
      // Backend là nguồn chân lý overdue nên cần paidAmount để resolve đúng.
      items,
      total,
      limit:  query.limit,
      offset: query.offset,
    };
  }
}

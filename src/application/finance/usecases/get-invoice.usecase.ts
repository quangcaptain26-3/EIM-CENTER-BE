import { InvoiceRepoPort } from "../../../domain/finance/repositories/invoice.repo.port";
import { PaymentRepoPort } from "../../../domain/finance/repositories/payment.repo.port";
import { mapInvoice } from "../mappers/finance.mapper";

/**
 * UseCase: Lấy chi tiết một Hóa đơn kèm danh sách thanh toán và tính toán Amount còn lại.
 */
export class GetInvoiceUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepoPort,
    private readonly paymentRepo: PaymentRepoPort,
  ) {}

  async execute(id: string) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new Error("Không tìm thấy hóa đơn");

    const [payments, paidAmount] = await Promise.all([
      this.paymentRepo.listByInvoice(id),
      this.paymentRepo.sumPaid(id),
    ]);

    return mapInvoice(invoice, { payments, paidAmount: paidAmount });
  }
}

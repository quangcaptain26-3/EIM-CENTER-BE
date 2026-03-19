import { InvoiceRepoPort } from "../../../domain/finance/repositories/invoice.repo.port";
import { PaymentRepoPort } from "../../../domain/finance/repositories/payment.repo.port";
import { InvoiceStatus } from "../../../domain/finance/value-objects/invoice-status.vo";
import { canChangeInvoiceStatus } from "../../../domain/finance/services/invoice-status.rule";
import { UpdateInvoiceStatusBody } from "../dtos/invoice.dto";
import { mapInvoice } from "../mappers/finance.mapper";
import { AppError } from "../../../shared/errors/app-error";

/**
 * UseCase: Cập nhật trạng thái Hóa đơn.
 * Kiểm tra nghiệp vụ canChangeInvoiceStatus trước khi thực hiện.
 * Nếu muốn chuyển sang ISSUED thì gọi markIssued để tự động set issued_at = now().
 */
export class UpdateInvoiceStatusUseCase {
  constructor(
    private readonly invoiceRepo: InvoiceRepoPort,
    private readonly paymentRepo: PaymentRepoPort,
  ) {}

  async execute(id: string, body: UpdateInvoiceStatusBody) {
    const invoice = await this.invoiceRepo.findById(id);
    if (!invoice) throw new Error("Không tìm thấy hóa đơn");

    const toStatus = body.status as InvoiceStatus;

    // Kiểm tra luồng trạng thái hợp lệ
    if (!canChangeInvoiceStatus(invoice.status, toStatus)) {
      throw new Error(
        `Không thể chuyển trạng thái hóa đơn từ "${invoice.status}" sang "${toStatus}"`
      );
    }

    // Enforce integrity khi chuyển sang PAID/OVERDUE:
    // - PAID => remainingAmount phải <= 0
    // - OVERDUE => dueDate đã tới hạn (due < today) và còn nợ (remaining > 0)
    if (toStatus === "PAID" || toStatus === "OVERDUE") {
      const paidAmount = await this.paymentRepo.sumPaid(id);
      const remainingAmount = Number(invoice.amount) - Number(paidAmount);

      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const due = invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate);
      due.setHours(0, 0, 0, 0);

      if (toStatus === "PAID" && remainingAmount > 0) {
        throw AppError.badRequest("Không thể chuyển sang PAID khi hóa đơn còn nợ", {
          invoiceId: id,
          remainingAmount,
        });
      }

      if (toStatus === "OVERDUE") {
        if (remainingAmount <= 0) {
          throw AppError.badRequest("Không thể chuyển sang OVERDUE khi hóa đơn đã đủ tiền", {
            invoiceId: id,
          });
        }
        if (!(due < today)) {
          throw AppError.badRequest("Không thể chuyển sang OVERDUE khi chưa tới hạn", {
            invoiceId: id,
            dueDate: invoice.dueDate,
          });
        }
      }
    }

    let updated: typeof invoice;

    if (toStatus === "ISSUED") {
      // Nếu chuyển sang ISSUED thì dùng markIssued để đồng thời set issued_at
      updated = await this.invoiceRepo.markIssued(id);
    } else {
      updated = await this.invoiceRepo.updateStatus(id, toStatus);
    }

    return mapInvoice(updated);
  }
}

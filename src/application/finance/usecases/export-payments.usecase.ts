import { z } from "zod";
import type { Writable } from "stream";
import type { PaymentRepoPort } from "../../../domain/finance/repositories/payment.repo.port";
import type { PaymentsExporter } from "../../../infrastructure/excel/payments.exporter";
import { AppError } from "../../../shared/errors/app-error";

const ExportPaymentsQuerySchema = z.object({
  fromDate: z.string().min(1),
  toDate: z.string().min(1),
  method: z.string().optional(),
  limit: z.coerce.number().min(1).max(5000).default(5000),
});

export class ExportPaymentsUseCase {
  private readonly MAX_EXPORT_ROWS = 5000;

  constructor(
    private readonly paymentRepo: PaymentRepoPort,
    private readonly paymentsExporter: PaymentsExporter,
  ) {}

  async execute(params: {
    fromDate: string;
    toDate: string;
    method?: string;
    limit?: number;
  }): Promise<Buffer> {
    const validated = ExportPaymentsQuerySchema.parse(params);

    const rows = await this.paymentRepo.listForExport({
      fromDate: validated.fromDate,
      toDate: validated.toDate,
      method: validated.method,
      limit: validated.limit,
    });

    if (rows.length > this.MAX_EXPORT_ROWS) {
      throw AppError.badRequest("Số giao dịch xuất vượt ngưỡng an toàn", {
        code: "FINANCE_PAYMENT_EXPORT/ROW_LIMIT_EXCEEDED",
        rowLimit: this.MAX_EXPORT_ROWS,
      });
    }

    return this.paymentsExporter.exportPayments(rows);
  }

  async stream(params: {
    fromDate: string;
    toDate: string;
    method?: string;
    limit?: number;
  }, writable: Writable): Promise<void> {
    const validated = ExportPaymentsQuerySchema.parse(params);

    const rows = await this.paymentRepo.listForExport({
      fromDate: validated.fromDate,
      toDate: validated.toDate,
      method: validated.method,
      limit: validated.limit,
    });

    if (rows.length > this.MAX_EXPORT_ROWS) {
      throw AppError.badRequest("Số giao dịch xuất vượt ngưỡng an toàn", {
        code: "FINANCE_PAYMENT_EXPORT/ROW_LIMIT_EXCEEDED",
        rowLimit: this.MAX_EXPORT_ROWS,
      });
    }

    await this.paymentsExporter.streamPayments(rows, writable);
  }
}


import { InvoiceRepoPort } from "../../../domain/finance/repositories/invoice.repo.port";
import { FinanceExporter } from "../../../infrastructure/excel/finance.exporter";
import type { Writable } from "stream";
import { AppError } from "../../../shared/errors/app-error";

export class ExportInvoicesUseCase {
  private readonly MAX_EXPORT_ROWS = 10000;

  constructor(
    private readonly invoiceRepo: InvoiceRepoPort,
    private readonly financeExporter: FinanceExporter
  ) {}

  /**
   * Export hóa đơn trong khoảng thời gian (kèm theo các filter optional)
   * R6: Mặc định chỉ xuất invoice của enrollment ACTIVE/PAUSED; set includeTerminatedEnrollments=true để bao gồm cả đã kết thúc.
   */
  async execute(params: {
    fromDate: string;
    toDate: string;
    status?: string;
    enrollmentId?: string;
    overdue?: boolean;
    includeTerminatedEnrollments?: boolean;
  }): Promise<Buffer> {
    
    // Lấy dữ liệu từ Repo đã join sẵn student & payment
    const rawData = await this.invoiceRepo.listForExport({
      fromDate: params.fromDate,
      toDate: params.toDate,
      status: params.status,
      enrollmentId: params.enrollmentId,
      overdue: params.overdue,
      includeTerminatedEnrollments: params.includeTerminatedEnrollments,
      limit: this.MAX_EXPORT_ROWS + 1,
    });

    if (rawData.length > this.MAX_EXPORT_ROWS) {
      throw AppError.badRequest("Số hóa đơn xuất vượt ngưỡng an toàn", {
        code: "FINANCE_INVOICE_EXPORT/ROW_LIMIT_EXCEEDED",
        rowLimit: this.MAX_EXPORT_ROWS,
      });
    }

    // Exporter
    return await this.financeExporter.exportInvoices(rawData);
  }

  async stream(params: {
    fromDate: string;
    toDate: string;
    status?: string;
    enrollmentId?: string;
    overdue?: boolean;
    includeTerminatedEnrollments?: boolean;
  }, writable: Writable): Promise<void> {
    const rawData = await this.invoiceRepo.listForExport({
      fromDate: params.fromDate,
      toDate: params.toDate,
      status: params.status,
      enrollmentId: params.enrollmentId,
      overdue: params.overdue,
      includeTerminatedEnrollments: params.includeTerminatedEnrollments,
      limit: this.MAX_EXPORT_ROWS + 1,
    });

    if (rawData.length > this.MAX_EXPORT_ROWS) {
      throw AppError.badRequest("Số hóa đơn xuất vượt ngưỡng an toàn", {
        code: "FINANCE_INVOICE_EXPORT/ROW_LIMIT_EXCEEDED",
        rowLimit: this.MAX_EXPORT_ROWS,
      });
    }

    await this.financeExporter.streamInvoices(rawData, writable);
  }
}

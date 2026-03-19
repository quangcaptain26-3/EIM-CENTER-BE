import { Invoice } from "../entities/invoice.entity";
import { InvoiceStatus } from "../value-objects/invoice-status.vo";

/**
 * Port Repository cho Hóa đơn (Invoice)
 * Quản lý Data Access cho Hóa đơn.
 */
export interface InvoiceRepoPort {
  /** Liệt kê hóa đơn có lọc và phân trang */
  list(params: {
    status?: InvoiceStatus;
    enrollmentId?: string;
    overdue?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Invoice[]>;

  /** Đếm số lượng hóa đơn theo điều kiện để phân trang */
  count(params: {
    status?: InvoiceStatus;
    enrollmentId?: string;
    overdue?: boolean;
  }): Promise<number>;

  /** Lấy danh sách hóa đơn để xuất Excel, kèm theo summary payment và student info */
  listForExport(params: {
    fromDate: string;
    toDate: string;
    status?: string;
    enrollmentId?: string;
    overdue?: boolean;
    limit?: number;
  }): Promise<any[]>;

  /** Tạo mới một hóa đơn */
  create(input: Omit<Invoice, "id" | "createdAt" | "issuedAt" | "status"> & { status?: InvoiceStatus }): Promise<Invoice>;

  /** Tìm theo ID */
  findById(id: string): Promise<Invoice | null>;

  /** Cập nhật trạng thái một hóa đơn */
  updateStatus(id: string, status: InvoiceStatus): Promise<Invoice>;

  /** Đổi trạng thái sang ISSUED và set issued_at = now() */
  markIssued(id: string): Promise<Invoice>;

  /**
   * Helper (Optional): Kiểm tra và đánh dấu hóa đơn là PAID.
   * Logic: Nếu tổng thanh toán (SUM(finance_payments) >= invoice.amount)
   *        thì đổi status sang PAID.
   */
  markPaidIfFullyPaid(invoiceId: string): Promise<Invoice>;
}

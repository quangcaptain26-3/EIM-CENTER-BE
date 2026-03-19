import { Payment } from "../entities/payment.entity";

/**
 * Port Repository quản lý Thanh toán (Payment)
 */
export interface PaymentRepoPort {
  /** Lịch sử tạo một Payment mới */
  create(input: Omit<Payment, "id" | "createdAt">): Promise<Payment>;

  /** Lấy danh sách các khoản thanh toán đã đóng của một Hóa đơn cụ thể */
  listByInvoice(invoiceId: string): Promise<Payment[]>;

  /** Trả về tổng số tiền mà học viên/khách hàng đã đóng cho một Hóa đơn cụ thể */
  sumPaid(invoiceId: string): Promise<number>;

  /** Trả về ngày thanh toán gần nhất của một hóa đơn (null nếu chưa có payment) */
  getLastPaidAt(invoiceId: string): Promise<Date | null>;

  /**
   * Export thanh toán (payments) ra danh sách dòng chi tiết.
   * Lọc theo paid_at (tính theo date, tránh lệch timezone bằng cách cast ::date).
   */
  listForExport(params: {
    fromDate: string;
    toDate: string;
    method?: string;
    limit?: number;
  }): Promise<any[]>;
}

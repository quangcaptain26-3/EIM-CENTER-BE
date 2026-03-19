/**
 * Entity đại diện cho Lịch sử thanh toán (Payment).
 * Lưu thông tin mỗi lần người dùng đóng tiền (đóng một phần hoặc toàn bộ Hóa đơn).
 */
export type Payment = {
  id: string;        // UUID
  invoiceId: string; // Tham chiếu đến Hóa đơn (finance_invoices)
  amount: number;    // Số tiền thanh toán ở lần này
  method: string;    // Phương thức thanh toán: CASH, TRANSFER, CARD, OTHER
  paidAt: Date;      // Thời gian thực sự thanh toán
  createdAt: Date;   // Hệ thống ghi lại lúc tạo
};

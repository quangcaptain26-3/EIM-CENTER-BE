/**
 * Value Object đại diện cho trạng thái của Hóa đơn (Invoice).
 * DRAFT: Nháp
 * ISSUED: Đã phát hành (chờ thanh toán)
 * PAID: Đã thanh toán đầy đủ
 * OVERDUE: Quá hạn thanh toán
 * CANCELED: Đã hủy
 */
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "CANCELED";

export const InvoiceStatuses: InvoiceStatus[] = [
  "DRAFT",
  "ISSUED",
  "PAID",
  "OVERDUE",
  "CANCELED",
];

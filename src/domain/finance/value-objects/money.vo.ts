/**
 * Value Object đại diện cho số tiền (Money) trong logic tài chính hệ thống.
 * Hỗ trợ tiền tệ mặc định là VND.
 *
 * QUAN TRỌNG — precision:
 * - amount phải là integer (đơn vị đồng VND, không có phần lẻ).
 * - DB: finance_invoices.amount, finance_payments.amount dùng INT.
 * - Không dùng JS float để tránh precision error khi cộng dồn payments.
 */
export type Money = {
  /** Số tiền (integer VND). Ví dụ: 5000000 = 5 triệu đồng. */
  amount: number;
  currency: "VND" | string;
};

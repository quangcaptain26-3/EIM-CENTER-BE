/**
 * Value Object đại diện cho số tiền (Money) trong logic tài chính hệ thống.
 * Hỗ trợ tiền tệ mặc định là VND.
 */
export type Money = {
  amount: number;
  currency: "VND" | string;
};

import { z } from "zod";

const PAYMENT_METHODS = ["CASH", "TRANSFER", "CARD", "OTHER"] as const;

/**
 * Dữ liệu đầu vào khi tạo một khoản thanh toán mới.
 */
export const CreatePaymentBodySchema = z.object({
  invoiceId: z.string().uuid({ message: "invoiceId phải là UUID hợp lệ" }),
  amount:    z.number().int().positive("Số tiền phải lớn hơn 0"),
  method:    z.enum(PAYMENT_METHODS, { error: "method phải là CASH, TRANSFER, CARD hoặc OTHER" }),
  paidAt:    z.string().datetime({ message: "paidAt phải là ISO datetime hợp lệ" }),
});
export type CreatePaymentBody = z.infer<typeof CreatePaymentBodySchema>;

import { z } from "zod";

/** Trạng thái thanh toán cho danh sách học sinh theo enrollment + invoice */
export const PaymentStatusFilter = [
  "paid",
  "unpaid",
  "partial",
  "overdue",
  "no_invoice",
] as const;
export type PaymentStatusFilter = (typeof PaymentStatusFilter)[number];

/**
 * Query params cho API danh sách trạng thái thanh toán học sinh.
 * Dựa trên enrollment + invoice + payment, không theo student thuần.
 */
export const ListStudentPaymentStatusQuerySchema = z.object({
  /** Lọc theo trạng thái thanh toán */
  paymentStatus: z
    .enum(PaymentStatusFilter as unknown as [string, ...string[]])
    .optional(),
  /** Lọc theo lớp học */
  classId: z.string().uuid().optional(),
  /** Lọc theo chương trình học */
  programId: z.string().uuid().optional(),
  /** Tìm theo tên học viên (ILIKE) */
  keyword: z
    .string()
    .transform((s) => (s?.trim().length ? s.trim() : undefined))
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ListStudentPaymentStatusQuery = z.infer<
  typeof ListStudentPaymentStatusQuerySchema
>;

/** Một dòng trong danh sách trạng thái thanh toán học sinh */
export interface StudentPaymentStatusItem {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  classId: string | null;
  classCode: string | null;
  programId: string | null;
  programName: string | null;
  invoiceId: string | null;
  invoiceAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  paymentStatus: PaymentStatusFilter;
}

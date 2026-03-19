import { z } from "zod";
import { InvoiceStatuses } from "../../../domain/finance/value-objects/invoice-status.vo";

const normalizeInvoiceStatus = (v: unknown) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return v;
  const t = v.trim();
  if (t.length === 0) return undefined;
  const upper = t.toUpperCase();
  if (upper === "ALL") return undefined;
  // Common alias (UK spelling) -> internal enum
  if (upper === "CANCELLED") return "CANCELED";
  return upper;
};

const blankToUndefined = (v: unknown) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
};

/**
 * Dữ liệu đầu vào khi tạo mới Hóa đơn.
 */
export const CreateInvoiceBodySchema = z.object({
  enrollmentId: z.string().uuid({ message: "enrollmentId phải là UUID hợp lệ" }),
  // Nếu không truyền amount, backend sẽ resolve từ fee plan của Program (curriculum_programs.fee_plan_id).
  // Giữ backward-compatible: vẫn cho phép truyền tay để override trong trường hợp đặc biệt.
  amount:       z.number().int().positive("Số tiền phải lớn hơn 0").optional(),
  dueDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate phải có định dạng YYYY-MM-DD"),
});
export type CreateInvoiceBody = z.infer<typeof CreateInvoiceBodySchema>;

/**
 * Dữ liệu đầu vào khi cập nhật trạng thái Hóa đơn.
 */
export const UpdateInvoiceStatusBodySchema = z.object({
  status: z.enum(InvoiceStatuses as [string, ...string[]]),
});
export type UpdateInvoiceStatusBody = z.infer<typeof UpdateInvoiceStatusBodySchema>;

/**
 * Tham số để lọc và phân trang danh sách Hóa đơn.
 */
export const ListInvoicesQuerySchema = z.object({
  status: z.preprocess(
    normalizeInvoiceStatus,
    z.enum(InvoiceStatuses as [string, ...string[]]).optional()
  ),
  enrollmentId: z.preprocess(blankToUndefined, z.string().uuid().optional()),
  /**
   * Lọc "quá hạn" theo rule backend (due_date < today và remaining > 0).
   * Khi bật cờ này, backend sẽ tự lấy candidate invoices và trả status hiệu lực = OVERDUE nếu phù hợp.
   */
  overdue: z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional()),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
  offset:       z.coerce.number().int().min(0).default(0),
});
export type ListInvoicesQuery = z.infer<typeof ListInvoicesQuerySchema>;

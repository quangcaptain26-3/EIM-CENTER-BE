import { z } from "zod";

const blankToUndefined = (v: unknown) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t.length === 0 ? undefined : t;
};

/**
 * Tham số query để lấy danh sách Audit Logs (có phân trang và bộ lọc).
 */
export const ListAuditLogsQuerySchema = z.object({
  // Lọc theo người thực hiện (UUID)
  actorUserId: z.preprocess(
    blankToUndefined,
    z.string().uuid({ message: "actorUserId phải là UUID hợp lệ" })
  ).optional(),

  // Lọc theo loại hành động, ví dụ: "AUTH_LOGIN", "STUDENT_CREATE"
  action: z.preprocess(blankToUndefined, z.string().min(1)).optional(),

  // Lọc từ ngày (ISO 8601 datetime string)
  fromDate: z.preprocess(blankToUndefined, z.coerce.date()).optional(),

  // Lọc đến ngày (ISO 8601 datetime string)
  toDate: z.preprocess(blankToUndefined, z.coerce.date()).optional(),

  // Số bản ghi mỗi trang (mặc định 20, tối đa 100)
  limit:  z.coerce.number().int().min(1).max(100).default(20),

  // Bỏ qua bao nhiêu bản ghi (phân trang)
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;

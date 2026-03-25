import { z } from "zod";

export const promoteClassBodySchema = z.object({
  /** Lớp đích — null/undefined: tạo enrollment mới chưa xếp lớp (chờ có lớp) */
  toClassId: z.string().uuid("toClassId phải là UUID").optional().nullable(),
  /** true = học lại cùng level (không lên chương trình), bỏ qua kiểm tra thứ tự program */
  isRepeat: z.boolean().optional().default(false),
  note: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  closeSourceClass: z.boolean().optional().default(true),
});

export type PromoteClassBody = z.infer<typeof promoteClassBodySchema>;

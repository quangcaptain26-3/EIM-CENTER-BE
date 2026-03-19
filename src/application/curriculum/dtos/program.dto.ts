import { z } from 'zod';

/**
 * Zod Schema cho request tạo mới Program
 */
export const CreateProgramBodySchema = z.object({
  code: z.string().min(1, "Mã chương trình không được để trống"),
  name: z.string().min(1, "Tên chương trình không được để trống"),
  level: z.string().min(1, "Cấp độ (level) không được để trống"), // KINDY | STARTERS | MOVERS | FLYERS
  totalUnits: z.number().int().positive("Tổng số unit phải là số nguyên dương"),
  lessonsPerUnit: z.number().int().positive().optional(),
  sessionsPerWeek: z.number().int().positive().optional(),
  feePlanId: z.string().uuid("ID Gói học phí không hợp lệ").optional().nullable(),
});

/**
 * Type TypeScript được suy luận (infer) tự động từ Zod Schema
 */
export type CreateProgramBody = z.infer<typeof CreateProgramBodySchema>;

/**
 * Zod Schema cho request cập nhật Program (dùng partial: chỉ update các trường có gửi lên)
 */
export const UpdateProgramBodySchema = CreateProgramBodySchema.partial();
export type UpdateProgramBody = z.infer<typeof UpdateProgramBodySchema>;

import { z } from 'zod';

/**
 * Zod Schema cho request tạo mới Unit
 */
export const CreateUnitBodySchema = z.object({
  unitNo: z.number().int().positive("Số thứ tự Unit phải là số nguyên dương"),
  title: z.string().min(1, "Tiêu đề Unit không được để trống"),
});
export type CreateUnitBody = z.infer<typeof CreateUnitBodySchema>;

/**
 * Zod Schema cho request cập nhật Unit
 */
export const UpdateUnitBodySchema = z.object({
  title: z.string().min(1, "Tiêu đề Unit không được để trống").optional(),
  totalLessons: z.number().int().positive("Tổng số lesson phải là số nguyên dương").optional(),
});
export type UpdateUnitBody = z.infer<typeof UpdateUnitBodySchema>;

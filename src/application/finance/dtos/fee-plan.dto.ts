import { z } from "zod";

/**
 * Dữ liệu đầu vào khi tạo mới Gói học phí.
 */
export const CreateFeePlanBodySchema = z.object({
  programId:       z.string().uuid({ message: "programId phải là UUID hợp lệ" }),
  name:            z.string().min(1, "Tên gói học phí không được để trống"),
  amount:          z.number().int().positive("Số tiền phải lớn hơn 0"),
  currency:        z.string().default("VND"),
  sessionsPerWeek: z.number().int().min(1).default(2),
});
export type CreateFeePlanBody = z.infer<typeof CreateFeePlanBodySchema>;

/**
 * Dữ liệu đầu vào khi cập nhật Gói học phí (các trường đều optional).
 */
export const UpdateFeePlanBodySchema = CreateFeePlanBodySchema
  .omit({ programId: true })
  .partial();
export type UpdateFeePlanBody = z.infer<typeof UpdateFeePlanBodySchema>;

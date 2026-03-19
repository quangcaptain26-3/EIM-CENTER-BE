import { z } from "zod";

/**
 * Payload cập nhật buổi học
 */
export const UpdateSessionSchema = z.object({
  sessionDate: z.string().datetime({ message: "sessionDate phải là định dạng ISO-8601" }).optional(),
  note: z.string().optional(), // Lý do đổi lịch
  coverTeacherId: z.string().uuid({ message: "coverTeacherId không hợp lệ" }).nullable().optional(),
  unitNo: z.number().int().positive().optional(),
  lessonNo: z.number().int().min(0).optional(),
});

export type UpdateSessionBody = z.infer<typeof UpdateSessionSchema>;

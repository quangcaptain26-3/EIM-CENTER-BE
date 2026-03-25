import { z } from "zod";

/**
 * Payload cập nhật buổi học
 */
const SessionStatusValues = ["SCHEDULED", "CANCELLED", "COMPLETED", "MAKEUP"] as const;

export const UpdateSessionSchema = z.object({
  sessionDate: z.string().datetime({ message: "sessionDate phải là định dạng ISO-8601" }).optional(),
  note: z.string().optional(), // Lý do đổi lịch
  sessionStatus: z.enum(SessionStatusValues).optional(), // Hủy buổi (CANCELLED) hoặc mở lại (SCHEDULED)
  coverTeacherId: z.string().uuid({ message: "coverTeacherId không hợp lệ" }).nullable().optional(),
  unitNo: z.number().int().positive().optional(),
  lessonNo: z.number().int().min(0).optional(),
});

export type UpdateSessionBody = z.infer<typeof UpdateSessionSchema>;

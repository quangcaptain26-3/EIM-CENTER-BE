import { z } from "zod";

export const ScheduleTrialSchema = z.object({
  classId: z.string().uuid("Class ID không hợp lệ"),
  trialDate: z.coerce.date({ message: "Ngày học thử (trial_date) bắt buộc" }), // Bắt buộc; sau khi lưu → status = SCHEDULED
});

export type ScheduleTrialBody = z.infer<typeof ScheduleTrialSchema>;

import { z } from "zod";

export const ScheduleTrialSchema = z.object({
  classId: z.string().uuid("Class ID không hợp lệ"),
  trialDate: z.coerce.date(),
});

export type ScheduleTrialBody = z.infer<typeof ScheduleTrialSchema>;

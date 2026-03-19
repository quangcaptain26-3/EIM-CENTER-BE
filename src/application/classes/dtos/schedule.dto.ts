import { z } from "zod";

const scheduleSchema = z.object({
  weekday: z.number().int().min(1, "Ngày trong tuần phải từ 1 (Thứ 2) đến 7 (Chủ nhật)").max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Thời gian bắt đầu không hợp lệ (HH:mm hoặc HH:mm:ss)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Thời gian kết thúc không hợp lệ (HH:mm hoặc HH:mm:ss)"),
}).refine(data => {
  // So sánh giờ kết thúc phải lớn hơn giờ bắt đầu (so sánh chuỗi trực tiếp vì định dạng HH:mm)
  return data.endTime > data.startTime;
}, {
  message: "Thời gian kết thúc phải lớn hơn thời gian bắt đầu",
  path: ["endTime"],
});

export const upsertSchedulesBodySchema = z.object({
  schedules: z.array(scheduleSchema),
});

export type UpsertSchedulesBody = z.infer<typeof upsertSchedulesBodySchema>;

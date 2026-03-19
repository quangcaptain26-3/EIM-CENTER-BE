import { z } from "zod";

/**
 * Payload yêu cầu tạo danh sách buổi học
 */
export const GenerateSessionsSchema = z.object({
  /**
   * Deprecated: Backend sẽ generate theo `class.startDate` để nhất quán business rule.
   * Giữ field để không phá FE cũ, nhưng sẽ không còn được dùng cho logic cấp phát ngày.
   */
  fromDate: z
    .string()
    .datetime({ message: "fromDate phải là định dạng ISO-8601 (YYYY-MM-DD)" })
    .optional(),
  weeks: z.number().int().positive().optional(),
  untilUnitNo: z.number().int().positive().optional(),
});

export type GenerateSessionsBody = z.infer<typeof GenerateSessionsSchema>;

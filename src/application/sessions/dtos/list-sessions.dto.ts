import { z } from "zod";

/**
 * Payload query danh sách buổi học
 */
export const ListSessionsQuerySchema = z.object({
  // Tương lai có thể thêm fromDate, toDate, hoặc pagination
});

export type ListSessionsQuery = z.infer<typeof ListSessionsQuerySchema>;

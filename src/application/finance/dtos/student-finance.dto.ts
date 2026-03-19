import { z } from "zod";

/**
 * Query params khi xem tóm tắt tài chính của một học viên.
 */
export const StudentFinanceQuerySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type StudentFinanceQuery = z.infer<typeof StudentFinanceQuerySchema>;

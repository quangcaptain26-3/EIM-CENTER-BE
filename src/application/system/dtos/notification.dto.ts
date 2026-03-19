import { z } from "zod";

/**
 * Tham số query để lấy danh sách thông báo của một user (có phân trang).
 */
export const ListNotificationsQuerySchema = z.object({
  // Lọc theo trạng thái đọc: true = đã đọc, false = chưa đọc, undefined = tất cả
  isRead: z
    .string()
    .transform((v) => {
      if (v === "true")  return true;
      if (v === "false") return false;
      return undefined;
    })
    .optional(),

  // Số bản ghi mỗi trang (mặc định 20, tối đa 100)
  limit:  z.coerce.number().int().min(1).max(100).default(20),

  // Bỏ qua bao nhiêu bản ghi (phân trang)
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuerySchema>;

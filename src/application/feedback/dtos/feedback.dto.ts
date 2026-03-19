import { z } from 'zod';

export const UpsertFeedbackItemSchema = z.object({
  studentId: z.string().uuid('studentId phải là UUID hợp lệ'),
  attendance: z.string().optional().nullable(),
  homework: z.string().optional().nullable(),
  // Metrics có thể là số (1..5) từ FE hoặc chuỗi từ Excel/import.
  participation: z.union([z.string(), z.number()]).optional().nullable(),
  behavior: z.union([z.string(), z.number()]).optional().nullable(),
  languageUsage: z.union([z.string(), z.number()]).optional().nullable(),
  comment: z.string().optional().nullable(),
});

export const UpsertFeedbackBodySchema = z.object({
  items: z.array(UpsertFeedbackItemSchema).min(1, 'Danh sách đánh giá không được để trống'),
});

export type UpsertFeedbackBody = z.infer<typeof UpsertFeedbackBodySchema>;

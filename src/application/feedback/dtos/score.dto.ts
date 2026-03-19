import { z } from 'zod';

export const ScoreTypeSchema = z.enum(['TEST', 'MIDTERM', 'FINAL'], {
  message: 'Loại điểm phải là TEST, MIDTERM, hoặc FINAL'
});

export const UpsertScoreItemSchema = z.object({
  studentId: z.string().uuid('studentId phải là UUID hợp lệ'),
  scoreType: ScoreTypeSchema,
  listening: z.number().min(0).max(100).optional().nullable(),
  reading: z.number().min(0).max(100).optional().nullable(),
  writing: z.number().min(0).max(100).optional().nullable(),
  speaking: z.number().min(0).max(100).optional().nullable(),
  total: z.number().min(0).max(100).optional().nullable(),
  note: z.string().optional().nullable(),
});

export const UpsertScoresBodySchema = z.object({
  items: z.array(UpsertScoreItemSchema).min(1, 'Danh sách điểm không được để trống'),
});

export type UpsertScoresBody = z.infer<typeof UpsertScoresBodySchema>;

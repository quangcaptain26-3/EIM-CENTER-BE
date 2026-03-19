import { z } from 'zod';

export const ListStudentFeedbackQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

export type ListStudentFeedbackQuery = z.infer<typeof ListStudentFeedbackQuerySchema>;

export const ListStudentScoresQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

export type ListStudentScoresQuery = z.infer<typeof ListStudentScoresQuerySchema>;

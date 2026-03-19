import { z } from "zod";

export const CurriculumScopeSchema = z.enum(["program", "unit", "lesson"]);
export type CurriculumScope = z.infer<typeof CurriculumScopeSchema>;

// domain session_pattern: '1&2' | '3' | '4&5' | '6&7'
export const SessionPatternSchema = z.enum(["1&2", "3", "4&5", "6&7"]);

export const CurriculumLessonPayloadSchema = z.object({
  lessonNo: z.number().int().positive(),
  title: z.string().min(1),
  // Nếu client không gửi, server sẽ tự derive từ lessonNo để đảm bảo contract nhất quán.
  sessionPattern: SessionPatternSchema.optional(),
});

export const CurriculumUnitPayloadSchema = z.object({
  unitNo: z.number().int().positive(),
  title: z.string().min(1),
  totalLessons: z.number().int().positive(),
  lessons: z.array(CurriculumLessonPayloadSchema).optional(),
});

export const CurriculumProgramPayloadSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  level: z.string().min(1),
  totalUnits: z.number().int().positive(),
  // Nếu thiếu, server sẽ dùng default theo DB migration (7 và 2).
  lessonsPerUnit: z.number().int().positive().optional(),
  sessionsPerWeek: z.number().int().positive().optional(),
  feePlanId: z.string().uuid().optional().nullable(),
  units: z.array(CurriculumUnitPayloadSchema).optional(),
});

export const CurriculumExportQuerySchema = z.object({
  scope: CurriculumScopeSchema.optional().default("lesson"),
  // CSV: program codes, ví dụ "ST1,ST2"
  programCodes: z.string().optional(),
});

export const CurriculumImportBodySchema = z.object({
  scope: CurriculumScopeSchema,
  version: z.number().int().positive().default(1),
  programs: z.array(CurriculumProgramPayloadSchema).min(1),
});

export type CurriculumExportQuery = z.infer<typeof CurriculumExportQuerySchema>;
export type CurriculumImportBody = z.infer<typeof CurriculumImportBodySchema>;
export type CurriculumProgramPayload = z.infer<typeof CurriculumProgramPayloadSchema>;
export type CurriculumUnitPayload = z.infer<typeof CurriculumUnitPayloadSchema>;
export type CurriculumLessonPayload = z.infer<typeof CurriculumLessonPayloadSchema>;


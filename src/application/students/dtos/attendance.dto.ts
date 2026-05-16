import { z } from 'zod';

const UUID_LIKE_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const IdSchema = z.string().regex(UUID_LIKE_REGEX, 'Invalid UUID');

export const RecordAttendanceSchema = z.object({
  sessionId: IdSchema,
  records: z.array(z.object({
    studentId: IdSchema,
    enrollmentId: IdSchema,
    status: z.enum(['present', 'absent_excused', 'absent_unexcused', 'late']),
    note: z.string().optional()
  }))
});
/** Dùng cho HTTP body: sessionId lấy từ URL param */
export const RecordAttendanceBodySchema = RecordAttendanceSchema.omit({
  sessionId: true,
});

export const EditAttendanceSchema = z.object({
  sessionId: IdSchema,
  records: z.array(z.object({
    studentId: IdSchema,
    enrollmentId: IdSchema,
    status: z.enum(['present', 'absent_excused', 'absent_unexcused', 'late']),
    note: z.string().optional()
  })),
  editReason: z.string().trim().min(1),
});

export const CreateMakeupSessionSchema = z.object({
  attendanceId: IdSchema,
  makeupDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date string',
  }),
  shift: z.union([z.literal(1), z.literal(2), z.literal('1'), z.literal('2')])
    .transform((val) => Number(val) as 1 | 2),
  roomId: IdSchema,
  teacherId: IdSchema,
  note: z.string().trim().optional(),
});

export const CompleteMakeupSessionSchema = z.object({
  makeupSessionId: IdSchema
});

/** GET /makeup-sessions/conflict-preview — kiểm tra trùng GV/phòng trước khi tạo học bù (đồng bộ logic với CreateMakeupSessionUseCase). */
export const PreviewMakeupConflictQuerySchema = z.object({
  makeupDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date string' }),
  shift: z.union([z.literal(1), z.literal(2), z.literal('1'), z.literal('2')]).transform((v) => Number(v) as 1 | 2),
  roomId: IdSchema,
  teacherId: IdSchema,
});

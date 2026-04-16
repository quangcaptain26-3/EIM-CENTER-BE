import { z } from 'zod';

export const RecordAttendanceSchema = z.object({
  sessionId: z.string().uuid(),
  records: z.array(z.object({
    studentId: z.string().uuid(),
    enrollmentId: z.string().uuid(),
    status: z.enum(['present', 'absent_excused', 'absent_unexcused', 'late']),
    note: z.string().optional()
  }))
});

export const CreateMakeupSessionSchema = z.object({
  attendanceId: z.string().uuid(),
  makeupDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date string',
  }),
  shift: z.union([z.literal(1), z.literal(2), z.literal('1'), z.literal('2')])
    .transform((val) => Number(val) as 1 | 2),
  roomId: z.string().uuid(),
  teacherId: z.string().uuid()
});

export const CompleteMakeupSessionSchema = z.object({
  makeupSessionId: z.string().uuid()
});

import { z } from 'zod';
import {
  SCHEDULE_DAYS_COUNT,
  SCHEDULE_DAYS_MAX,
  SCHEDULE_DAYS_MIN,
  SCHEDULE_DAYS_MIN_GAP,
} from '../../../config/constants';

const scheduleDaysSchema = z
  .array(z.number().int().min(SCHEDULE_DAYS_MIN).max(SCHEDULE_DAYS_MAX))
  .length(SCHEDULE_DAYS_COUNT)
  .refine((days) => days[0] !== days[1], { message: 'Không được chọn cùng 1 ngày' })
  .refine(
    (days) => {
      const sorted = [...days].sort((a, b) => a - b);
      return sorted[1] - sorted[0] >= SCHEDULE_DAYS_MIN_GAP;
    },
    { message: 'Hai ngày học phải cách nhau ít nhất 1 ngày' },
  )
  .transform((days) => [...days].sort((a, b) => a - b));

export const CreateClassDto = z.object({
  programCode: z.enum(['KINDY', 'STARTERS', 'MOVERS', 'FLYERS']),
  roomId: z.string().uuid(),
  shift: z.union([z.literal(1), z.literal(2)]),
  scheduleDays: scheduleDaysSchema,
  teacherId: z.string().uuid(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid Date format' }),
});

export const UpdateClassDto = z.object({
  roomId: z.string().uuid().optional(),
  shift: z.union([z.literal(1), z.literal(2)]).optional(),
  scheduleDays: scheduleDaysSchema.optional(),
  teacherId: z.string().uuid().optional(),
});

export const RescheduleDto = z.object({
  newDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid Date format' }),
  reason: z.string().min(10),
});

export const AssignCoverDto = z.object({
  coverTeacherId: z.string().uuid(),
  reason: z.string(),
});

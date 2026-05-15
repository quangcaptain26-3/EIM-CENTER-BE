import { z } from 'zod';
import {
  SCHEDULE_DAYS_COUNT,
  SCHEDULE_DAYS_MAX,
  SCHEDULE_DAYS_MIN,
  SCHEDULE_DAYS_MIN_GAP,
} from '../../../config/constants';
import { PgUuidStringSchema } from '../../finance/dtos/finance.dto';

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
  programCode: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v),
    z.enum(['KINDY', 'STARTERS', 'MOVERS', 'FLYERS']),
  ),
  roomId: PgUuidStringSchema,
  shift: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2)])),
  scheduleDays: scheduleDaysSchema,
  teacherId: PgUuidStringSchema,
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid Date format' }),
});

export const UpdateClassDto = z.object({
  roomId: PgUuidStringSchema.optional(),
  shift: z.preprocess(
    (v) => (v === undefined || v === null || v === '' ? undefined : Number(v)),
    z.union([z.literal(1), z.literal(2)]).optional(),
  ),
  scheduleDays: scheduleDaysSchema.optional(),
  teacherId: PgUuidStringSchema.optional(),
});

export const RescheduleDto = z.object({
  newDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid Date format' }),
  reason: z.string().min(10),
});

export const AssignCoverDto = z.object({
  coverTeacherId: PgUuidStringSchema,
  reason: z.string(),
});

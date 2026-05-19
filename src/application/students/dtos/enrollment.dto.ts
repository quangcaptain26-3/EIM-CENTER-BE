import { z } from 'zod';
import { PgUuidStringSchema } from '../../finance/dtos/finance.dto';

/** Chuẩn hóa camelCase / snake_case trước khi validate UUID. */
const createEnrollmentBodySchema = z.object({
  studentId: PgUuidStringSchema,
  classId: PgUuidStringSchema,
  status: z.enum(['reserved', 'pending', 'trial']).optional().default('pending'),
  reservationFee: z.number().positive().optional(),
  /** Nếu không có, dùng program.defaultFee */
  tuitionFee: z.number().nonnegative().optional(),
});

export const CreateEnrollmentSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object') return input;
  const o = input as Record<string, unknown>;
  return {
    ...o,
    studentId: o.studentId ?? o.student_id,
    classId: o.classId ?? o.class_id,
  };
}, createEnrollmentBodySchema);

export type CreateEnrollmentDto = z.infer<typeof createEnrollmentBodySchema>;

export const CompleteEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid()
});

export const DropEnrollmentBodySchema = z.object({
  reasonType: z.string().min(1, 'Vui lòng chọn loại lý do'),
  reasonDetail: z.string().min(1, 'Vui lòng nhập chi tiết lý do'),
});

export const DropEnrollmentSchema = DropEnrollmentBodySchema.extend({
  enrollmentId: z.string().uuid(),
});

export const TransferClassBodySchema = z.object({
  /** UUID lớp hoặc class_code (EIM-LS-01) — resolve ở use case */
  newClassId: z.string().min(1, 'Chọn lớp mới'),
});

export const TransferClassSchema = TransferClassBodySchema.extend({
  enrollmentId: z.string().uuid(),
});

export const PauseEnrollmentBodySchema = z.object({
  reason: z.string().min(20, 'Lý do bảo lưu cần ít nhất 20 ký tự'),
});

const pauseEnrollmentDtoSchema = PauseEnrollmentBodySchema.extend({
  enrollmentId: PgUuidStringSchema,
});

export const PauseEnrollmentSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object') return input;
  const o = input as Record<string, unknown>;
  return {
    ...o,
    enrollmentId: o.enrollmentId ?? o.enrollment_id ?? o.id,
  };
}, pauseEnrollmentDtoSchema);

export const ReviewPauseRequestSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().optional(),
});

export const ApprovePauseRequestBodySchema = z.object({
  reviewNote: z.string().optional(),
});

export const RejectPauseRequestBodySchema = z.object({
  reviewNote: z.string().min(1, 'Cần nhập lý do từ chối'),
});

export const TransferEnrollmentSchema = z.object({
  fromEnrollmentId: z.string().uuid(),
  toStudentId: z.string().uuid(),
  toClassId: z.string().uuid(),
});

export type TransferEnrollmentDto = z.infer<typeof TransferEnrollmentSchema>;

/** Q15: body POST /enrollments/:id/reset-makeup-blocked (enrollmentId lấy từ URL) */
export const ResetMakeupBlockedBodySchema = z.object({
  reason: z.string().min(10, 'Lý do mở khóa cần ít nhất 10 ký tự'),
});

export const CancelReservationBodySchema = z.object({
  reasonDetail: z.string().min(1, 'Vui lòng nhập lý do hủy giữ chỗ'),
});

export const CancelReservationSchema = CancelReservationBodySchema.extend({
  enrollmentId: z.string().uuid(),
});

export const ReassignReservedClassBodySchema = z.object({
  newClassId: z.string().min(1, 'Chọn lớp mới'),
});

export const ReassignReservedClassSchema = ReassignReservedClassBodySchema.extend({
  enrollmentId: z.string().uuid(),
});

export const TransferReservationBodySchema = z.object({
  newClassId: z.string().min(1, 'Chọn lớp mới'),
  reasonDetail: z.string().min(1, 'Vui lòng nhập lý do chuyển giữ chỗ'),
});

export const TransferReservationSchema = TransferReservationBodySchema.extend({
  enrollmentId: z.string().uuid(),
});

export const AdjustPlacementBodySchema = z.object({
  newClassId: z.string().min(1, 'Chọn lớp mới'),
  note: z
    .string()
    .min(10, 'Ghi chú cần ít nhất 10 ký tự')
    .optional(),
});

export const AdjustPlacementSchema = AdjustPlacementBodySchema.extend({
  enrollmentId: z.string().uuid(),
});

const ResumeEnrollmentBodySchema = z
  .object({
    classId: PgUuidStringSchema.optional(),
    targetClassId: PgUuidStringSchema.optional(),
    acknowledgeInsufficientSessions: z.boolean().optional(),
  })
  .refine((data) => !(data.classId && data.targetClassId && data.classId !== data.targetClassId), {
    message: 'classId và targetClassId phải trùng nhau nếu cùng được truyền',
    path: ['targetClassId'],
  });

/** POST body có thể rỗng (tiếp tục học tại lớp hiện tại). */
export const ResumeEnrollmentSchema = z.preprocess(
  (val) => (val === undefined || val === null ? {} : val),
  ResumeEnrollmentBodySchema,
);

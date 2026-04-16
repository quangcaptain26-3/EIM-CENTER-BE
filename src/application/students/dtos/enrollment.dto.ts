import { z } from 'zod';

export const CreateEnrollmentSchema = z.object({
  studentId: z.string().uuid('studentId phải là UUID hợp lệ'),
  classId: z.string().uuid('classId phải là UUID hợp lệ'),
  /** Nếu không có, dùng program.defaultFee */
  tuitionFee: z.number().nonnegative().optional(),
});

export type CreateEnrollmentDto = z.infer<typeof CreateEnrollmentSchema>;

export const CompleteEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid()
});

export const DropEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid(),
  reasonType: z.string().min(1, 'Vui lòng chọn loại lý do'),
  reasonDetail: z.string().min(1, 'Vui lòng nhập chi tiết lý do')
});

export const TransferClassSchema = z.object({
  enrollmentId: z.string().uuid(),
  newClassId: z.string().uuid()
});

export const PauseEnrollmentSchema = z.object({
  enrollmentId: z.string().uuid(),
  reason: z.string().min(20, 'Lý do bảo lưu cần ít nhất 20 ký tự'),
});

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

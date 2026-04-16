import { z } from 'zod';

export const CreateRefundRequestSchema = z.object({
  enrollmentId: z.string().uuid(),
  reasonType: z.string().min(1, 'Lý do không được để trống'),
  reasonDetail: z.string().min(1, 'Chi tiết lý do không được để trống'),
  refundAmount: z.number().min(0).optional() // Required for special_case
});

export const ReviewRefundRequestSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().min(1, 'Ghi chú đánh giá không được để trống') // Bắt buộc cho cả approve và reject hoặc tùy ý. Requirement ghi reject bắt buộc, ta có thể validate trong usecase.
});

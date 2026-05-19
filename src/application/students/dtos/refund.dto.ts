import { z } from 'zod';

export const CreateRefundRequestSchema = z.object({
  enrollmentId: z.string().uuid(),
  reasonType: z.enum([
    'center_unable_to_open',
    'center_unable_within_60days',
    'subjective_no_interest',
    'subjective_schedule_conflict',
    'subjective_financial',
    'subjective_relocation',
    'subjective_other',
    'special_case',
  ]),
  reasonDetail: z.string().min(1, 'Chi tiết lý do không được để trống'),
  refundAmount: z.number().min(0).optional(),
  reviewNote: z.string().optional(),
});

export const ReviewRefundRequestSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().optional(),
  approvedAmount: z.number().min(0).optional(),
});

import { z } from 'zod';

// ─── Receipt ─────────────────────────────────────────────────────────────────

export const CreateReceiptSchema = z
  .object({
    payerName:           z.string().min(1, 'Vui lòng nhập tên người nộp'),
    payerAddress:        z.string().optional(),
    studentId:           z.string().uuid('studentId phải là UUID hợp lệ'),
    enrollmentId:        z.string().uuid('enrollmentId phải là UUID hợp lệ'),
    reason:              z.string().min(1, 'Vui lòng nhập lý do thu'),
    amount:              z.number().refine((v) => v !== 0, { message: 'Số tiền không được bằng 0' }),
    paymentMethod:       z.enum(['cash', 'transfer']),
    paymentDate:         z.string().datetime({ offset: true }).or(z.string().date()),
    note:                z.string().optional(),
    payerSignatureName:  z.string().optional(),
    voidedByReceiptId:   z.string().uuid('voidedByReceiptId phải là UUID hợp lệ').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.amount < 0 && !data.voidedByReceiptId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['voidedByReceiptId'],
        message: 'voidedByReceiptId bắt buộc khi amount < 0 (phiếu âm bù trừ)',
      });
    }
  });

export type CreateReceiptDto = z.infer<typeof CreateReceiptSchema>;

// ─── List Receipts filter ─────────────────────────────────────────────────────

export const ListReceiptsSchema = z.object({
  studentId:     z.string().uuid().optional(),
  enrollmentId:  z.string().uuid().optional(),
  dateFrom:      z.string().date().optional(),
  dateTo:        z.string().date().optional(),
  paymentMethod: z.enum(['cash', 'transfer']).optional(),
  page:          z.coerce.number().int().min(1).default(1),
  limit:         z.coerce.number().int().min(1).max(100).default(20),
});

export type ListReceiptsDto = z.infer<typeof ListReceiptsSchema>;

// ─── List Payment Status filter ───────────────────────────────────────────────

export const ListPaymentStatusSchema = z.object({
  classId:     z.string().uuid().optional(),
  programCode: z.string().optional(),
  hasDebt:     z.coerce.boolean().optional(),
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPaymentStatusDto = z.infer<typeof ListPaymentStatusSchema>;

// ─── Finance Dashboard filter ─────────────────────────────────────────────────

export const FinanceDashboardSchema = z.object({
  month:     z.coerce.number().int().min(1).max(12).optional(),
  year:      z.coerce.number().int().min(2000).max(2100),
  quarter:   z.coerce.number().int().min(1).max(4).optional(),
  yearFrom:  z.coerce.number().int().min(2000).optional(),
  yearTo:    z.coerce.number().int().max(2100).optional(),
});

export type FinanceDashboardDto = z.infer<typeof FinanceDashboardSchema>;

// ─── Payroll ──────────────────────────────────────────────────────────────────

export const PayrollPeriodSchema = z.object({
  teacherId: z.string().uuid('teacherId phải là UUID hợp lệ'),
  month:     z.coerce.number().int().min(1).max(12),
  year:      z.coerce.number().int().min(2000).max(2100),
});

export type PayrollPeriodDto = z.infer<typeof PayrollPeriodSchema>;

export const ListPayrollsSchema = z.object({
  teacherId: z.string().uuid().optional(),
  month:     z.coerce.number().int().min(1).max(12).optional(),
  year:      z.coerce.number().int().min(2000).optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPayrollsDto = z.infer<typeof ListPayrollsSchema>;

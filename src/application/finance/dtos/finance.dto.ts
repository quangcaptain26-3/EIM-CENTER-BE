import { z } from 'zod';

/**
 * UUID dạng PostgreSQL / seed dev. Zod 4 `z.string().uuid()` từ chối nhiều id hợp lệ trong DB → 400 oan.
 */
export const PgUuidStringSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    'Phải là UUID (8-4-4-4-12 ký tự hex)',
  );

// ─── Receipt ─────────────────────────────────────────────────────────────────

export const CreateReceiptSchema = z
  .object({
    payerName:           z.string().min(1, 'Vui lòng nhập tên người nộp'),
    payerAddress:        z.string().optional(),
    studentId:           PgUuidStringSchema,
    enrollmentId:        PgUuidStringSchema,
    reason:              z.string().min(1, 'Vui lòng nhập lý do thu'),
    amount:              z.number().refine((v) => v !== 0, { message: 'Số tiền không được bằng 0' }),
    paymentMethod:       z.enum(['cash', 'transfer']),
    paymentDate:         z.string().datetime({ offset: true }).or(z.string().date()),
    note:                z.string().optional(),
    payerSignatureName:  z.string().optional(),
    voidedByReceiptId:   PgUuidStringSchema.optional(),
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
  studentId:     PgUuidStringSchema.optional(),
  enrollmentId:  PgUuidStringSchema.optional(),
  dateFrom:      z.string().date().optional(),
  dateTo:        z.string().date().optional(),
  paymentMethod: z.enum(['cash', 'transfer']).optional(),
  page:          z.coerce.number().int().min(1).default(1),
  limit:         z.coerce.number().int().min(1).max(100).default(20),
});

export type ListReceiptsDto = z.infer<typeof ListReceiptsSchema>;

// ─── List Payment Status filter ───────────────────────────────────────────────

export const ListPaymentStatusSchema = z.object({
  classId:     PgUuidStringSchema.optional(),
  programId:   PgUuidStringSchema.optional(),
  programCode: z.string().optional(),
  hasDebt:     z.coerce.boolean().default(true),
  debtOver30Days: z.coerce.boolean().optional(),
  /** Khi true: gồm trial, reserved, pending (chưa kích hoạt) còn thiếu học phí */
  includePipeline: z.coerce.boolean().optional(),
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
  teacherId: PgUuidStringSchema,
  month:     z.coerce.number().int().min(1).max(12),
  year:      z.coerce.number().int().min(2000).max(2100),
});

export type PayrollPeriodDto = z.infer<typeof PayrollPeriodSchema>;

export const ListPayrollsSchema = z.object({
  teacherId: PgUuidStringSchema.optional(),
  month:     z.coerce.number().int().min(1).max(12).optional(),
  year:      z.coerce.number().int().min(2000).optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPayrollsDto = z.infer<typeof ListPayrollsSchema>;

/** GET /payroll/unfinalized-summaries — bắt buộc tháng+năm để liệt kê GV chưa chốt trong kỳ. */
export const ListUnfinalizedPayrollSchema = z.object({
  month:     z.coerce.number().int().min(1).max(12),
  year:      z.coerce.number().int().min(2000).max(2100),
  teacherId: PgUuidStringSchema.optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(30),
});

export type ListUnfinalizedPayrollDto = z.infer<typeof ListUnfinalizedPayrollSchema>;

/** Q29: PATCH ghi chú bảng lương GV (không sửa tiền) */
export const PayrollNotesBodySchema = z.object({
  notes: z.union([z.string().max(4000), z.null()]),
});

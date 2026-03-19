import { z } from "zod";

export const CreateTrialSchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống").max(255),
  phone: z.string().min(10, "Số điện thoại không hợp lệ").max(20),
  email: z.string().email("Email không hợp lệ").optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export type CreateTrialBody = z.infer<typeof CreateTrialSchema>;

export const UpdateTrialSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: z.enum(["NEW", "CONTACTED", "SCHEDULED", "ATTENDED", "NO_SHOW", "CONVERTED", "CLOSED"]).optional(),
  note: z.string().max(1000).optional().nullable(),
});

export type UpdateTrialBody = z.infer<typeof UpdateTrialSchema>;

export const ListTrialsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "SCHEDULED", "ATTENDED", "NO_SHOW", "CONVERTED", "CLOSED"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type ListTrialsQuery = z.infer<typeof ListTrialsSchema>;

// =========================
// Export Trials
// =========================

export const ExportTrialsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["NEW", "CONTACTED", "SCHEDULED", "ATTENDED", "NO_SHOW", "CONVERTED", "CLOSED"]).optional(),
  // Export giới hạn để tránh build Excel/DB quá nặng.
  limit: z.coerce.number().min(1).max(5000).default(1000),
});

export type ExportTrialsQuery = z.infer<typeof ExportTrialsSchema>;

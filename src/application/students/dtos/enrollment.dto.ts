import { z } from "zod";
import { EnrollmentStatuses } from "../../../domain/students/value-objects/enrollment-status.vo";

/**
 * Schema Validation cho request thêm mới Ghi danh.
 * Hỗ trợ class_code (mã lớp thân thiện) thay cho classId — người dùng không cần nhập UUID.
 */
export const CreateEnrollmentBodySchema = z.object({
  studentId: z.string().uuid("ID Học viên phải là UUID"),
  // classId (UUID) hoặc class_code (mã lớp) — ưu tiên class_code nếu có
  classId: z.string().uuid("ID Lớp học phải là UUID").optional().nullable(),
  class_code: z.string().min(1).optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Ngày bắt đầu không hợp lệ",
  }),
});
export type CreateEnrollmentBody = z.infer<typeof CreateEnrollmentBodySchema>;

/**
 * Schema Validation cho request cập nhật trạng thái Ghi danh
 */
export const UpdateEnrollmentStatusBodySchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "DROPPED", "TRANSFERRED", "GRADUATED"]),
  note: z.string().optional()
});
export type UpdateEnrollmentStatusBody = z.infer<typeof UpdateEnrollmentStatusBodySchema>;

/**
 * Schema Validation cho request chuyển lớp.
 * Hỗ trợ toClassCode (mã lớp thân thiện) thay cho toClassId — người dùng không cần nhập UUID.
 */
export const TransferEnrollmentBodySchema = z.object({
  toClassId: z.string().uuid("ID Lớp học chuyển đến phải là UUID").optional(),
  toClassCode: z.string().min(1).optional(),
  /** Ngày hiệu lực chuyển lớp (YYYY-MM-DD). Mặc định: hôm nay */
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Lý do / ghi chú chuyển lớp */
  note: z.string().optional(),
}).refine(
  (data) => data.toClassId || data.toClassCode,
  { message: "Cần cung cấp toClassId hoặc toClassCode (mã lớp đích)" }
);
export type TransferEnrollmentBody = z.infer<typeof TransferEnrollmentBodySchema>;

import { z } from "zod";
import { EnrollmentStatuses } from "../../../domain/students/value-objects/enrollment-status.vo";

/**
 * Schema Validation cho request thêm mới Ghi danh
 */
export const CreateEnrollmentBodySchema = z.object({
  studentId: z.string().uuid("ID Học viên phải là UUID"),
  // Cho phép tạo enrollment trước, chưa xếp lớp (classId = null/undefined)
  classId: z.string().uuid("ID Lớp học phải là UUID").optional().nullable(),
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
 * Schema Validation cho request chuyển lớp
 */
export const TransferEnrollmentBodySchema = z.object({
  toClassId: z.string().uuid("ID Lớp học chuyển đến phải là UUID"),
  note: z.string().optional()
});
export type TransferEnrollmentBody = z.infer<typeof TransferEnrollmentBodySchema>;

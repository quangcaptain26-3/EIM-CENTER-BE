import { z } from "zod";

/**
 * Schema Validation cho request tạo mới Học viên
 */
export const CreateStudentBodySchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống"),
  dob: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Ngày sinh không đúng định dạng",
  }),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  address: z.string().optional(),
});

export type CreateStudentBody = z.infer<typeof CreateStudentBodySchema>;

/**
 * Schema Validation cho request cập nhật Học viên
 */
export const UpdateStudentBodySchema = CreateStudentBodySchema.partial();
export type UpdateStudentBody = z.infer<typeof UpdateStudentBodySchema>;

/**
 * Schema Validation cho query params danh sách Học viên
 */
export const ListStudentsQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 10),
  offset: z.string().optional().transform(v => v ? parseInt(v, 10) : 0),
});
export type ListStudentsQuery = z.infer<typeof ListStudentsQuerySchema>;

// =========================
// Export Students
// =========================
export const ExportStudentsQuerySchema = z.object({
  search: z.string().optional(),
  // Giới hạn xuất để tránh build Excel/DB quá nặng.
  limit: z.coerce.number().min(1).max(5000).default(1000),
});

export type ExportStudentsQuery = z.infer<typeof ExportStudentsQuerySchema>;

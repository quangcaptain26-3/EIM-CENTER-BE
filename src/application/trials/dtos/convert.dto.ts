import { z } from "zod";

/** DTO cho Student mới khi convert */
const StudentSchema = z.object({
  fullName: z.string().min(1, "Họ tên không được để trống").max(255).optional(),
  phone: z.string().min(10, "Số điện thoại không hợp lệ").max(20).optional(),
  email: z.string().email("Email không hợp lệ").optional().nullable(),
  guardianName: z.string().max(255).optional().nullable(),
  guardianPhone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  dob: z.coerce.date().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
});

export const ConvertTrialSchema = z.object({
  student: StudentSchema,
  /** Lớp học để xếp ngay (optional: có thể chưa xếp lớp) */
  classId: z.string().uuid("Class ID không hợp lệ").optional().nullable(),
  /** Ghi chú cho quá trình convert */
  note: z.string().max(1000).optional().nullable(),
  /**
   * Khi phát hiện student trùng (phone/email/guardian_phone):
   * - Không gửi: chặn convert, trả CONFLICT
   * - Gửi ID student có sẵn: dùng student đó thay vì tạo mới, tạo enrollment cho student đó
   */
  existingStudentId: z.string().uuid("existingStudentId phải là UUID").optional().nullable(),
});

export type ConvertTrialBody = z.infer<typeof ConvertTrialSchema>;

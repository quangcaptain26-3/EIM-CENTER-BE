import { z } from "zod";

// DTO cho Student mới khi convert
const StudentSchema = z.object({
  // Cho phép bỏ trống để BE fallback từ TrialLead.full_name (giảm điểm gãy journey).
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
  // Cho phép convert tạo enrollment trước, chưa xếp lớp ngay (bám blueprint tối thiểu)
  classId: z.string().uuid("Class ID không hợp lệ").optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export type ConvertTrialBody = z.infer<typeof ConvertTrialSchema>;

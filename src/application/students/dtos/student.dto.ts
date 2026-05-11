import { z } from 'zod';

export const CreateStudentSchema = z.object({
  fullName: z.string().min(1, 'Họ tên không được để trống'),
  dob: z.string().optional(), // Or z.date() if parsed
  gender: z.enum(['Nam', 'Nữ', 'Khác']).optional(),
  address: z.string().optional(),
  schoolName: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  parentPhone2: z.string().optional(),
  parentZalo: z.string().optional(),
  testResult: z.string().optional()
});

export type CreateStudentDto = z.infer<typeof CreateStudentSchema>;

export const UpdateStudentSchema = CreateStudentSchema.partial();

export type UpdateStudentDto = z.infer<typeof UpdateStudentSchema>;

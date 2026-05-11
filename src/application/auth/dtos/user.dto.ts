import { z } from 'zod';

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const CreateUserDtoSchema = z
  .object({
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .regex(
        passwordRegex,
        'Password must contain at least one uppercase letter, one number, and one special character',
      ),
    roleCode: z.enum(['ADMIN', 'ACADEMIC', 'ACCOUNTANT', 'TEACHER']),
    fullName: z.string().min(1),
    gender: z.enum(['male', 'female', 'other']).optional(),
    dob: z.coerce.date().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    cccd: z.string().optional(),
    nationality: z.string().optional(),
    ethnicity: z.string().optional(),
    religion: z.string().optional(),
    educationLevel: z.string().optional(),
    major: z.string().optional(),
    startDate: z.coerce.date().optional(),
    salaryPerSession: z.number().min(0).optional(),
    allowance: z.number().min(0).optional(),
  })
  .refine(
    (data) => {
      if (data.roleCode === 'TEACHER' && data.salaryPerSession === undefined) {
        return false;
      }
      return true;
    },
    {
      message: 'salaryPerSession is required for TEACHER role',
      path: ['salaryPerSession'],
    },
  );

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;

export const UpdateUserDtoSchema = z.object({
  fullName: z.string().min(1).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dob: z.coerce.date().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  cccd: z.string().optional(),
  nationality: z.string().optional(),
  ethnicity: z.string().optional(),
  religion: z.string().optional(),
  educationLevel: z.string().optional(),
  major: z.string().optional(),
  startDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;

export const UpdateSalaryDtoSchema = z.object({
  salaryPerSession: z.number().min(0).optional(),
  allowance: z.number().min(0).optional(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export type UpdateSalaryDto = z.infer<typeof UpdateSalaryDtoSchema>;

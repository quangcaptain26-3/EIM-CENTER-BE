import { z } from 'zod';

export const ListUsersQuerySchema = z.object({
  search: z.string().optional(),
  roleCode: z.string().optional(),
  role: z.string().optional(), // Alias: role=teacher -> roleCode=TEACHER (chọn cover teacher)
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListUsersQueryDto = z.infer<typeof ListUsersQuerySchema>;

export const CreateUserSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  fullName: z.string().min(1, 'Họ và tên không được để trống'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
  roleCode: z.string().min(1, 'Mã Role không được để trống'),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1, 'Họ và tên không được để trống').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const AssignRoleSchema = z.object({
  roleCode: z.string().min(1, 'Mã Role không được để trống'),
});

export type AssignRoleDto = z.infer<typeof AssignRoleSchema>;

export interface UserResponseDto {
  id: string;
  email: string;
  fullName: string;
  status: string;
  roles: string[];
  createdAt: string | Date;
}

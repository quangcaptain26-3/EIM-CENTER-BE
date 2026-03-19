/**
 * Thực thể Học viên
 */
export type Student = {
  id: string;
  fullName: string;
  dob?: Date;
  gender?: string;
  phone?: string;
  email?: string;
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  createdAt: Date;
};

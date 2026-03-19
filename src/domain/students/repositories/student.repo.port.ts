import { Student } from "../entities/student.entity";

/**
 * Interface Repository cho Học viên
 * Dùng để tương tác với dữ liệu Học viên (CRUD)
 */
export interface StudentRepoPort {
  list(params: { search?: string; limit?: number; offset?: number }): Promise<Student[]>;
  count(params: { search?: string }): Promise<number>;
  create(input: Omit<Student, "id" | "createdAt">): Promise<Student>;
  findById(id: string): Promise<Student | null>;
  update(id: string, patch: Partial<Omit<Student, "id" | "createdAt">>): Promise<Student>;
}

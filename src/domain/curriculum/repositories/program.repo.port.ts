import { Program } from '../entities/program.entity';

/**
 * Port cho repository xử lý Program (Chương trình học)
 */
export interface ProgramRepoPort {
  /**
   * Lấy danh sách tất cả các chương trình học
   */
  listPrograms(): Promise<Program[]>;

  /**
   * Tạo một chương trình học mới
   * @param input Các trường cần thiết để tạo Program
   */
  createProgram(input: Omit<Program, 'id' | 'createdAt'>): Promise<Program>;

  /**
   * Lấy thông tin chương trình học theo ID
   * @param id ID của chương trình
   */
  findProgramById(id: string): Promise<Program | null>;

  /**
   * Cập nhật thông tin chương trình học
   * @param id ID của chương trình
   * @param patch Các trường cần thay đổi
   */
  updateProgram(id: string, patch: Partial<Omit<Program, 'id' | 'createdAt'>>): Promise<Program>;
}

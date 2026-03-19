import { Unit, UnitLesson } from '../entities/unit.entity';

/**
 * Port cho repository xử lý Unit và Lesson
 */
export interface UnitRepoPort {
  /**
   * Lấy danh sách Unit thuộc về một Program
   * @param programId ID chương trình học
   */
  listUnitsByProgram(programId: string): Promise<Unit[]>;

  /**
   * Tạo một Unit mới cho Program
   * @param programId ID chương trình học
   * @param unitNo Số thứ tự của Unit
   * @param title Tên tiêu đề của Unit
   */
  createUnit(programId: string, unitNo: number, title: string): Promise<Unit>;

  /**
   * Tìm Unit thông qua ID
   * @param unitId ID của Unit
   */
  findUnitById(unitId: string): Promise<Unit | null>;

  /**
   * Cập nhật tóm tắt thông tin một Unit
   * @param unitId ID của Unit
   * @param patch Các trường cần thay đổi
   */
  updateUnit(unitId: string, patch: Partial<Omit<Unit, 'id' | 'programId' | 'createdAt'>>): Promise<Unit>;

  /**
   * Tạo danh sách 7 lessons nháp mặc định nếu Unit chưa có
   * @param unitId ID của Unit cần chèn lessons
   */
  upsertDefaultLessons(unitId: string): Promise<UnitLesson[]>;

  /**
   * Lấy danh sách các bài giảng (Lesson) của một Unit
   * @param unitId ID của Unit
   */
  listLessons(unitId: string): Promise<UnitLesson[]>;
}

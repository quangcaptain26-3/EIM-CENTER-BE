/**
 * Kiểu biểu diễn Session Pattern (mẫu bài giảng gộp chung một buổi)
 */
export type SessionPattern = '1&2' | '3' | '4&5' | '6&7';

/**
 * Thực thể Unit thuộc một Program
 */
export interface Unit {
  id: string; // uuid
  programId: string; // uuid của Program
  unitNo: number; // Số thứ tự Unit
  title: string; // Tên của Unit (vd: Unit 1: Hello)
  totalLessons: number; // Mặc định 7 bài
  createdAt: Date;
}

/**
 * Thực thể Lesson thuộc một Unit
 */
export interface UnitLesson {
  id: string; // uuid
  unitId: string; // uuid của Unit
  lessonNo: number; // Số thứ tự bài giảng
  title: string;
  sessionPattern: SessionPattern; // Mẫu gộp bài
  createdAt: Date;
}

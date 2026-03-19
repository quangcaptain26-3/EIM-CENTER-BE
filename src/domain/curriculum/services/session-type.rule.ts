import { SessionPattern } from '../entities/unit.entity';

/**
 * Hàm lấy cấu hình Session Pattern mặc định dựa trên số thứ tự bài giảng (Lesson No).
 * Chữ ký hàm định nghĩa sẵn, nội dung logic phụ thuộc vào nghiệp vụ cụ thể.
 *
 * @param lessonNo Số thứ tự của lesson (1..7)
 * @returns Mẫu gộp phiên bài giảng
 */
export function getLessonPattern(lessonNo: number): SessionPattern {
  // Logic mặc định theo pattern nghiệp vụ:
  // Lesson 1 & 2 -> "1&2"
  // Lesson 3      -> "3"
  // Lesson 4 & 5  -> "4&5"
  // Lesson 6 & 7  -> "6&7"
  
  if (lessonNo === 1 || lessonNo === 2) return '1&2';
  if (lessonNo === 3) return '3';
  if (lessonNo === 4 || lessonNo === 5) return '4&5';
  if (lessonNo === 6 || lessonNo === 7) return '6&7';
  
  // Trả về mặc định "3" hoặc có thể throw Error nếu số ngoài phạm vi hỗ trợ
  return '3';
}

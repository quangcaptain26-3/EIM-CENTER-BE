/**
 * Quy tắc nghiệp vụ (Business Rule) cho Classes.
 *
 * Hàm kiểm tra xem một lớp học có thể nhận thêm học viên hay không.
 *
 * @param currentCount - Số lượng học viên hiện tại (từ Roster)
 * @param capacity - Sức chứa tối đa của lớp học
 * @returns boolean - true nếu còn chỗ, ngược lại false
 */
export function canEnroll(currentCount: number, capacity: number): boolean {
  if (capacity <= 0) return false;
  return currentCount < capacity;
}

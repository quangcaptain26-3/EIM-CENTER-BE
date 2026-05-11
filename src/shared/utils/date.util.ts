/** Offset UTC+7 tính theo milli-seconds */
const UTC7_OFFSET_MS = 7 * 60 * 60 * 1_000;

/**
 * Trả về ISO 8601 string của ngày/giờ đã cộng thêm UTC+7.
 *
 * @example
 *   formatUTC7(new Date('2024-01-15T10:00:00Z')) // → '2024-01-15T17:00:00.000+07:00'
 */
export function formatUTC7(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    throw new Error(`[formatUTC7] Invalid date: ${date}`);
  }

  const local = new Date(d.getTime() + UTC7_OFFSET_MS);

  // Lấy ISO string rồi thay 'Z' bằng '+07:00'
  return local.toISOString().replace('Z', '+07:00');
}

// ---------------------------------------------------------------------------

export interface Holiday {
  date:        Date;
  isRecurring: boolean; // true = so sánh month+day mỗi năm; false = full date
}

/**
 * Kiểm tra xem một ngày có phải ngày lễ không.
 *
 * - `isRecurring = true`  → chỉ so sánh tháng + ngày (lặp hàng năm)
 * - `isRecurring = false` → so sánh full date (năm + tháng + ngày)
 */
export function isHoliday(date: Date, holidays: Holiday[]): boolean {
  const checkYear  = date.getUTCFullYear();
  const checkMonth = date.getUTCMonth();   // 0-indexed
  const checkDay   = date.getUTCDate();

  return holidays.some((h) => {
    const hMonth = h.date.getUTCMonth();
    const hDay   = h.date.getUTCDate();

    if (h.isRecurring) {
      return hMonth === checkMonth && hDay === checkDay;
    }

    const hYear = h.date.getUTCFullYear();
    return hYear === checkYear && hMonth === checkMonth && hDay === checkDay;
  });
}

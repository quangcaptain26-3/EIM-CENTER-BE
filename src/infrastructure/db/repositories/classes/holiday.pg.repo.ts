/**
 * Đọc ngày lễ từ DB — dùng generate-sessions & reschedule (tránh tạo buổi vào ngày nghỉ).
 */
export class HolidayPgRepo {
  constructor(private readonly db: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) {}

  /** Định dạng thống nhất với SessionGeneratorService / RescheduleSessionUseCase */
  async findAll(): Promise<Array<{ date: Date; isRecurring: boolean }>> {
    const res = await this.db.query(
      `SELECT holiday_date, is_recurring FROM holidays ORDER BY holiday_date ASC`,
    );
    return (res.rows as { holiday_date: Date; is_recurring: boolean }[]).map((row) => ({
      date: new Date(row.holiday_date),
      isRecurring: Boolean(row.is_recurring),
    }));
  }
}

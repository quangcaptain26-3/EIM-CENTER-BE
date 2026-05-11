import type { Pool } from 'pg';

/**
 * Cron / job: hết hạn giữ chỗ 30 ngày — Q32, OVERVIEW §5.6.
 *
 * Cách vận hành:
 * - Enrollment `reserved` có `enrolled_at` quá 30 ngày → chuyển `dropped` (phí giữ chỗ không tự hoàn — cam kết phụ huynh).
 * - Nếu lỗi trung tâm (không khai giảng / quá hạn 60 ngày): không dùng job này để hoàn tiền — Admin tạo `refund_request` + quy trình Q19.
 * - Ghi `enrollment_history` với note cố định để audit trace.
 */
export class ExpireReservedEnrollmentsUseCase {
  constructor(private readonly db: Pool) {}

  async execute(): Promise<{ expiredCount: number }> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const upd = await client.query<{ id: string }>(
        `UPDATE enrollments
         SET status = 'dropped', updated_at = NOW()
         WHERE status = 'reserved'
           AND enrolled_at <= NOW() - INTERVAL '30 days'
         RETURNING id`,
      );
      const ids = upd.rows.map((r) => r.id);
      if (ids.length === 0) {
        await client.query('COMMIT');
        return { expiredCount: 0 };
      }

      const note =
        'Q32: Hết hạn 30 ngày giữ chỗ — tự động dropped; phí giữ chỗ không hoàn (trừ lỗi trung tâm / Q19).';
      for (const id of ids) {
        await client.query(
          `INSERT INTO enrollment_history (
             enrollment_id, action, from_status, to_status, changed_by, note
           ) VALUES ($1, 'dropped', 'reserved', 'dropped', NULL, $2)`,
          [id, note],
        );
      }

      await client.query('COMMIT');
      return { expiredCount: ids.length };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

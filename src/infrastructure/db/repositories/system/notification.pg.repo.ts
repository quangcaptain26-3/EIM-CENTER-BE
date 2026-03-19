import { pool } from "../../pg-pool";
import { Notification } from "../../../../domain/system/entities/notification.entity";
import {
  NotificationRepoPort,
  NotificationListParams,
  NotificationCountParams,
  NotificationCreateInput,
} from "../../../../domain/system/repositories/notification.repo.port";

/**
 * Implementation PostgreSQL cho NotificationRepoPort.
 * Tương tác trực tiếp với bảng system_notifications.
 */
export class NotificationPgRepo implements NotificationRepoPort {
  /** Chuyển row từ DB sang Notification entity */
  private mapRow(row: any): Notification {
    return {
      id:        row.id,
      userId:    row.user_id,
      title:     row.title,
      body:      row.body,
      isRead:    row.is_read,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * Lấy danh sách thông báo của một user.
   * Hỗ trợ lọc theo trạng thái đọc (isRead) và phân trang.
   * Sắp xếp thông báo mới nhất lên đầu.
   */
  async listByUser(userId: string, params: NotificationListParams): Promise<Notification[]> {
    const conditions: string[] = ["user_id = $1"];
    const values: any[] = [userId];
    let idx = 2;

    // Lọc theo trạng thái đọc nếu được truyền vào
    if (params.isRead !== undefined) {
      conditions.push(`is_read = $${idx++}`);
      values.push(params.isRead);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const limit   = params.limit  ?? 50;
    const offset  = params.offset ?? 0;
    const limitIdx  = idx++;
    const offsetIdx = idx;
    values.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT * FROM system_notifications
       ${where}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values
    );

    return rows.map((r) => this.mapRow(r));
  }

  /**
   * Đếm số thông báo của một user theo bộ lọc.
   * Dùng cho phân trang và badge count (số thông báo chưa đọc).
   */
  async countByUser(userId: string, params: NotificationCountParams): Promise<number> {
    const conditions: string[] = ["user_id = $1"];
    const values: any[] = [userId];
    let idx = 2;

    if (params.isRead !== undefined) {
      conditions.push(`is_read = $${idx++}`);
      values.push(params.isRead);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM system_notifications ${where}`,
      values
    );

    return rows[0]?.total ?? 0;
  }

  /**
   * Tạo một thông báo mới cho user.
   * is_read mặc định = false (chưa đọc) theo DB default.
   */
  async create(input: NotificationCreateInput): Promise<Notification> {
    const { rows } = await pool.query(
      `INSERT INTO system_notifications (user_id, title, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.userId, input.title, input.body]
    );

    return this.mapRow(rows[0]);
  }

  /**
   * Đánh dấu một thông báo là đã đọc.
   * Điều kiện WHERE bao gồm cả user_id để đảm bảo mỗi user
   * chỉ được phép đọc thông báo của chính mình (security guard).
   * Trả về null nếu không tìm thấy hoặc không có quyền.
   */
  async markRead(notificationId: string, userId: string): Promise<Notification | null> {
    const { rows } = await pool.query(
      `UPDATE system_notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  /**
   * Đánh dấu toàn bộ thông báo của một user là đã đọc.
   */
  async markAllReadByUser(userId: string): Promise<number> {
    const { rowCount } = await pool.query(
      `UPDATE system_notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return rowCount ?? 0;
  }
}

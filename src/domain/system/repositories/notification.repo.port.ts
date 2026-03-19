import { Notification } from "../entities/notification.entity";

/**
 * Tham số lọc khi lấy danh sách thông báo của một user.
 */
export interface NotificationListParams {
  isRead?: boolean; // Lọc theo trạng thái đọc (true/false). Không truyền = lấy tất cả
  limit?: number;   // Số bản ghi tối đa
  offset?: number;  // Bỏ qua bao nhiêu bản ghi (phân trang)
}

/**
 * Tham số đếm thông báo của một user.
 */
export interface NotificationCountParams {
  isRead?: boolean; // Lọc theo trạng thái đọc
}

/**
 * Input tạo thông báo mới.
 */
export interface NotificationCreateInput {
  userId: string;   // ID người nhận
  title: string;    // Tiêu đề thông báo
  body: string;     // Nội dung thông báo (đã đổi tên từ message)
}

/**
 * Port Repository cho Thông báo hệ thống (Notifications).
 * Chỉ khai báo interface — implementation ở infrastructure layer.
 */
export interface NotificationRepoPort {
  /**
   * Lấy danh sách thông báo của một user, hỗ trợ lọc và phân trang.
   */
  listByUser(userId: string, params: NotificationListParams): Promise<Notification[]>;

  /**
   * Đếm số thông báo của một user thoả mãn bộ lọc (dùng cho phân trang / badge).
   */
  countByUser(userId: string, params: NotificationCountParams): Promise<number>;

  /**
   * Tạo một thông báo mới cho user.
   */
  create(input: NotificationCreateInput): Promise<Notification>;

  /**
   * Đánh dấu thông báo đã đọc.
   * Chỉ cập nhật nếu thông báo thuộc về userId này (bảo mật: không cho đọc của người khác).
   * Trả về null nếu không tìm thấy hoặc không có quyền.
   */
  markRead(notificationId: string, userId: string): Promise<Notification | null>;

  /**
   * Đánh dấu tất cả thông báo của một user là đã đọc.
   * Trả về số lượng thông báo đã được cập nhật.
   */
  markAllReadByUser(userId: string): Promise<number>;
}

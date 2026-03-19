/**
 * Entity: Thông báo hệ thống (Notification)
 * Đại diện cho một thông báo được gửi đến một user cụ thể.
 */
export type Notification = {
  id: string;       // UUID primary key
  userId: string;   // ID người nhận thông báo (auth_users)
  title: string;    // Tiêu đề thông báo
  body: string;     // Nội dung chi tiết thông báo (ISO chuẩn hoá)
  isRead: boolean;  // Trạng thái đã đọc (false = chưa đọc)
  createdAt: Date;  // Thời điểm tạo thông báo
};

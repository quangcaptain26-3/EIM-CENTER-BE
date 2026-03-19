/**
 * Domain Service Helper: Notification Rules
 * Cung cấp các tiện ích xây dựng và kiểm tra thông báo hệ thống.
 */

/** Độ dài tối đa cho phép của tiêu đề thông báo */
const MAX_TITLE_LENGTH = 200;

/** Độ dài tối đa cho phép của nội dung thông báo */
const MAX_BODY_LENGTH = 2000;

/**
 * Kết quả xây dựng thông báo đã được validate.
 */
export interface NotificationPayload {
  title: string;
  body: string;
}

/**
 * Xây dựng payload thông báo, đảm bảo title và body hợp lệ.
 * Cắt bớt nếu vượt quá độ dài tối đa.
 * Ném lỗi nếu title hoặc body rỗng.
 *
 * @param title - Tiêu đề thông báo
 * @param body - Nội dung chi tiết thông báo
 * @returns NotificationPayload đã được làm sạch
 */
export function buildNotification(title: string, body: string): NotificationPayload {
  const trimmedTitle = (title ?? "").trim();
  const trimmedBody = (body ?? "").trim();

  if (!trimmedTitle) {
    throw new Error("Tiêu đề thông báo không được để trống");
  }

  if (!trimmedBody) {
    throw new Error("Nội dung thông báo không được để trống");
  }

  return {
    // Cắt bớt nếu vượt giới hạn để tránh lỗi DB
    title: trimmedTitle.slice(0, MAX_TITLE_LENGTH),
    body:  trimmedBody.slice(0, MAX_BODY_LENGTH),
  };
}

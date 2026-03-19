import { NotificationRepoPort } from "../../../domain/system/repositories/notification.repo.port";
import { mapNotification } from "../mappers/system.mapper";

/**
 * UseCase: Đánh dấu một thông báo là đã đọc.
 * userId phải khớp với owner của thông báo để đảm bảo bảo mật.
 * Ném lỗi nếu không tìm thấy (không có hoặc không có quyền).
 */
export class MarkNotificationReadUseCase {
  constructor(private readonly notificationRepo: NotificationRepoPort) {}

  async execute(notificationId: string, userId: string) {
    const updated = await this.notificationRepo.markRead(notificationId, userId);

    if (!updated) {
      throw new Error("Thông báo không tồn tại hoặc bạn không có quyền cập nhật");
    }

    return mapNotification(updated);
  }
}

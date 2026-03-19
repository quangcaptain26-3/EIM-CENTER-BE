import { NotificationRepoPort } from "../../../domain/system/repositories/notification.repo.port";

/**
 * UseCase: Đánh dấu tất cả thông báo của một user là đã đọc.
 * userId được lấy từ JWT (không cho phép người dùng tự truyền userId khác).
 */
export class MarkAllNotificationsReadUseCase {
  constructor(private readonly notificationRepo: NotificationRepoPort) {}

  async execute(userId: string) {
    const updatedCount = await this.notificationRepo.markAllReadByUser(userId);

    return { updatedCount };
  }
}

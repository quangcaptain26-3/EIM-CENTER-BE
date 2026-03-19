import { NotificationRepoPort } from "../../../domain/system/repositories/notification.repo.port";
import { ListNotificationsQuery } from "../dtos/notification.dto";
import { mapNotification } from "../mappers/system.mapper";

/**
 * UseCase: Lấy danh sách thông báo của một user có phân trang.
 * userId được lấy từ JWT (không cho phép người dùng tự truyền userId khác).
 */
export class ListNotificationsUseCase {
  constructor(private readonly notificationRepo: NotificationRepoPort) {}

  async execute(userId: string, query: ListNotificationsQuery) {
    const isRead = query.isRead as boolean | undefined;

    const [notifications, total] = await Promise.all([
      this.notificationRepo.listByUser(userId, {
        isRead,
        limit:  query.limit,
        offset: query.offset,
      }),
      this.notificationRepo.countByUser(userId, { isRead }),
    ]);

    // Trả về kết quả phân trang (PagedResult)
    return {
      items:  notifications.map((n) => mapNotification(n)),
      total,
      limit:  query.limit,
      offset: query.offset,
    };
  }
}

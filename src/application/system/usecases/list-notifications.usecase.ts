import { NotificationPgRepo } from '../../../infrastructure/db/repositories/system/notification.pg.repo';

export class ListNotificationsUseCase {
  constructor(private readonly notificationRepo: NotificationPgRepo) {}

  async execute(userId: string, limit = 20) {
    const items = await this.notificationRepo.listForUser(userId, limit);
    const unreadCount = await this.notificationRepo.countUnread(userId);
    return {
      data: {
        data: items.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.body,
          read: n.read,
          metadata: n.metadata,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
      },
    };
  }
}

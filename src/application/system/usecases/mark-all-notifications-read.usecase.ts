import { NotificationPgRepo } from '../../../infrastructure/db/repositories/system/notification.pg.repo';

export class MarkAllNotificationsReadUseCase {
  constructor(private readonly notificationRepo: NotificationPgRepo) {}

  async execute(userId: string) {
    await this.notificationRepo.markAllRead(userId);
    return { ok: true };
  }
}

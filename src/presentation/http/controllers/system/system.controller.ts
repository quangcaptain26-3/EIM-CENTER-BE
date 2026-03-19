import { Request, Response } from "express";
import { buildContainer } from "../../../../bootstrap/container";
import { ListAuditLogsQuerySchema } from "../../../../application/system/dtos/audit.dto";
import { ListNotificationsQuerySchema } from "../../../../application/system/dtos/notification.dto";

/**
 * SystemController: Xử lý các endpoint hệ thống
 *
 * RBAC:
 *  - Audit logs: chỉ ROOT, DIRECTOR mới có quyền xem
 *  - Notifications: mọi user đã đăng nhập đều tự xem được của mình (userId từ JWT)
 */
export class SystemController {

  // ==========================================
  // AUDIT LOGS (/api/v1/system/audit-logs)
  // ==========================================

  /**
   * GET /system/audit-logs
   * Lấy danh sách audit log có phân trang và bộ lọc.
   * Quyền: ROOT, DIRECTOR
   *
   * Ví dụ: GET /api/v1/system/audit-logs?action=AUTH_LOGIN&limit=20
   */
  async listAuditLogs(req: Request, res: Response) {
    const query = ListAuditLogsQuerySchema.parse(req.query);
    const container = buildContainer();
    const data = await container.system.listAuditLogsUsecase.execute(query);
    return res.json({ success: true, data });
  }

  // ==========================================
  // NOTIFICATIONS (/api/v1/system/notifications)
  // ==========================================

  /**
   * GET /system/notifications
   * Lấy danh sách thông báo của user đang đăng nhập.
   * userId lấy từ JWT — không cho phép truyền userId khác.
   *
   * Ví dụ: GET /api/v1/system/notifications?isRead=false&limit=20
   */
  async listNotifications(req: Request, res: Response) {
    const userId = (req as any).user?.userId as string;
    const query  = ListNotificationsQuerySchema.parse(req.query);
    const container = buildContainer();
    const data = await container.system.listNotificationsUsecase.execute(userId, query);
    return res.json({ success: true, data });
  }
  /**
   * PATCH /system/notifications/:id/read
   * Đánh dấu một thông báo của user hiện tại là đã đọc.
   * userId từ JWT đảm bảo user chỉ mark-read thông báo của chính mình.
   *
   * Ví dụ: PATCH /api/v1/system/notifications/<uuid>/read
   */
  async markNotificationRead(req: Request, res: Response) {
    const notificationId = String(req.params.id);
    const userId         = (req as any).user?.userId as string;
    const container = buildContainer();
    const data = await container.system.markNotificationReadUsecase.execute(notificationId, userId);
    return res.json({ success: true, data });
  }

  /**
   * PATCH /system/notifications/read-all
   * Đánh dấu tất cả thông báo của user hiện tại là đã đọc.
   */
  async markAllNotificationsRead(req: Request, res: Response) {
    const userId    = (req as any).user?.userId as string;
    const container = buildContainer();
    const result    = await container.system.markAllNotificationsReadUsecase.execute(userId);
    return res.json({ success: true, message: 'Đã đánh dấu tất cả thông báo là đã đọc', ...result });
  }
}


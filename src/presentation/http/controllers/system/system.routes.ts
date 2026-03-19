import { Router } from "express";
import { SystemController } from "./system.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/rbac.middleware";

export const systemRouter = Router();

const controller = new SystemController();

// Roles được phép xem audit log (chỉ quản lý cấp cao)
const AUDIT_ROLES = ["ROOT", "DIRECTOR"] as const;

// ==========================================
// AUDIT LOGS (/api/v1/system/audit-logs)
// ==========================================

// GET /system/audit-logs - chỉ ROOT, DIRECTOR
systemRouter.get(
  "/audit-logs",
  authMiddleware,
  requireRoles(AUDIT_ROLES as unknown as string[]),
  controller.listAuditLogs.bind(controller)
);

// ==========================================
// NOTIFICATIONS (/api/v1/system/notifications)
// ==========================================

// GET /system/notifications - mọi user đã đăng nhập (xem của chính mình)
systemRouter.get(
  "/notifications",
  authMiddleware,
  controller.listNotifications.bind(controller)
);

// PATCH /system/notifications/read-all - mọi user đã đăng nhập (chỉ mark của chính mình)
// Phải đặt trước /notifications/:id/read để tránh bị bắt nhầm vào :id
systemRouter.patch(
  "/notifications/read-all",
  authMiddleware,
  controller.markAllNotificationsRead.bind(controller)
);

// PATCH /system/notifications/:id/read - mọi user đã đăng nhập (chỉ mark của chính mình)
systemRouter.patch(
  "/notifications/:id/read",
  authMiddleware,
  controller.markNotificationRead.bind(controller)
);

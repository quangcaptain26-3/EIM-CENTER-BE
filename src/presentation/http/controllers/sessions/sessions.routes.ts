import { Router } from "express";
import { SessionsController } from "./sessions.controller";
import { buildContainer } from "../../../../bootstrap/container";
import { validate } from "../../middlewares/validate.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/rbac.middleware";
import { enforceTeacherOwnsSession, enforceTeacherCanReadSession, enforceTeacherSelfParam } from "../../middlewares/teacher-idor.middleware";
import { GenerateSessionsSchema } from "../../../../application/sessions/dtos/generate-sessions.dto";
import { UpdateSessionSchema } from "../../../../application/sessions/dtos/update-session.dto";

const router = Router({ mergeParams: true });
const container = buildContainer();
const controller = new SessionsController(
  container.sessions.generateSessionsUseCase,
  container.sessions.listClassSessionsUseCase,
  container.sessions.getSessionUseCase,
  container.sessions.updateSessionUseCase,
  container.sessions.listTeacherSessionsUseCase
);

/**
 * Endpoints dưới resource Class: /api/v1/classes/:id/sessions
 */

// Sinh danh sách buổi học
router.post(
  "/generate",
  authMiddleware,
  requireRoles(["ROOT", "ACADEMIC"]),
  validate(GenerateSessionsSchema),
  controller.generateSessions
);

// Lấy danh sách buổi học của lớp
router.get(
  "/",
  authMiddleware,
  requireRoles(["ROOT", "DIRECTOR", "ACADEMIC", "SALES", "ACCOUNTANT", "TEACHER"]),
  controller.listClassSessions
);

export const classSessionsRouter = router;

/**
 * Endpoints resource Sessions riêng biệt: /api/v1/sessions
 */
const sessionRouter = Router();

// Lấy chi tiết buổi học — Teacher dùng rule đọc (xem tất cả session lớp mình)
sessionRouter.get(
  "/:sessionId",
  authMiddleware,
  requireRoles(["ROOT", "DIRECTOR", "ACADEMIC", "SALES", "ACCOUNTANT", "TEACHER"]),
  enforceTeacherCanReadSession,
  controller.getSession
);

// Lấy danh sách buổi học của giáo viên
sessionRouter.get(
  "/teacher/:teacherId",
  authMiddleware,
  requireRoles(["ROOT", "DIRECTOR", "ACADEMIC", "TEACHER"]),
  enforceTeacherSelfParam("teacherId"),
  controller.listTeacherSessions
);

// Cập nhật buổi học (Đổi lịch, set user_id...)
sessionRouter.patch(
  "/:sessionId",
  authMiddleware,
  requireRoles(["ROOT", "ACADEMIC"]),
  validate(UpdateSessionSchema),
  controller.updateSession
);

export const sessionsRouter = sessionRouter;

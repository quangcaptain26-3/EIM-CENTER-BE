import { Router } from "express";
import { FeedbackController } from "./feedback.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { enforceTeacherOwnsSession } from "../../middlewares/teacher-idor.middleware";
import { z } from "zod";
import { UpsertFeedbackBodySchema } from "../../../../application/feedback/dtos/feedback.dto";
import { UpsertScoresBodySchema, UpsertScoreItemSchema } from "../../../../application/feedback/dtos/score.dto";
import { ListStudentFeedbackQuerySchema, ListStudentScoresQuerySchema } from "../../../../application/feedback/dtos/list.dto";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    // Chỉ chấp nhận .xlsx để giảm rủi ro upload sai định dạng
    const isXlsx =
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.originalname.toLowerCase().endsWith(".xlsx");
    if (!isXlsx) {
      return cb(new Error("Chỉ hỗ trợ file Excel định dạng .xlsx"));
    }
    return cb(null, true);
  },
});

export const sessionsFeedbackRouter = Router({ mergeParams: true });
export const studentsFeedbackRouter = Router({ mergeParams: true });
export const classesFeedbackRouter  = Router({ mergeParams: true });

const controller = new FeedbackController();

// ==========================================
// SESSION FEEDBACK & SCORES ROUTES (Mounted on /api/v1/sessions/:sessionId)
// ==========================================

// GET /sessions/:sessionId/feedback
sessionsFeedbackRouter.get(
  "/feedback",
  authMiddleware,
  requireRoles(["DIRECTOR", "ACADEMIC", "ACCOUNTANT", "TEACHER"]),
  enforceTeacherOwnsSession,
  controller.getSessionFeedback.bind(controller)
);

// GET /sessions/:sessionId/feedback/template
sessionsFeedbackRouter.get(
  "/feedback/template",
  authMiddleware,
  requireRoles(["DIRECTOR", "ACADEMIC", "TEACHER"]),
  enforceTeacherOwnsSession,
  controller.downloadSessionFeedbackTemplate.bind(controller)
);

// POST /sessions/:sessionId/feedback/upsert
sessionsFeedbackRouter.post(
  "/feedback/upsert",
  authMiddleware,
  // Manager read-only: chỉ TEACHER mới được ghi feedback
  requireRoles(["TEACHER"]),
  enforceTeacherOwnsSession,
  validate(z.object({ body: UpsertFeedbackBodySchema })),
  controller.upsertSessionFeedback.bind(controller)
);

// POST /sessions/:sessionId/feedback/import
sessionsFeedbackRouter.post(
  "/feedback/import",
  authMiddleware,
  // Manager read-only: chỉ TEACHER mới được import feedback
  requireRoles(["TEACHER"]),
  enforceTeacherOwnsSession,
  upload.single("file"),
  controller.importFeedbackBySession.bind(controller)
);

// POST /sessions/:sessionId/scores/upsert
sessionsFeedbackRouter.post(
  "/scores/upsert",
  authMiddleware,
  // Manager read-only: chỉ TEACHER mới được nhập điểm
  requireRoles(["TEACHER"]),
  enforceTeacherOwnsSession,
  validate(z.object({ body: UpsertScoresBodySchema })),
  controller.upsertSessionScores.bind(controller)
);


// ==========================================
// STUDENT FEEDBACK & SCORES ROUTES (Mounted on /api/v1/students/:id)
// ==========================================

// GET /students/:id/feedback
studentsFeedbackRouter.get(
  "/feedback",
  authMiddleware,
  // IDOR hardening: teacher không được xem lịch sử feedback học viên ngoài scope.
  // Nếu cần mở cho TEACHER trong tương lai, phải có scope rule rõ (theo lớp/buổi mà teacher phụ trách).
  requireRoles(["DIRECTOR", "ACADEMIC", "ACCOUNTANT"]),
  validate(z.object({ query: ListStudentFeedbackQuerySchema })),
  controller.getStudentFeedback.bind(controller)
);

// GET /students/:id/scores
studentsFeedbackRouter.get(
  "/scores",
  authMiddleware,
  // IDOR hardening: teacher không được xem lịch sử điểm của học viên ngoài scope.
  requireRoles(["DIRECTOR", "ACADEMIC", "ACCOUNTANT"]),
  validate(z.object({ query: ListStudentScoresQuerySchema })),
  controller.getStudentScores.bind(controller)
);

// ==========================================
// CLASS FEEDBACK EXPORT (Mounted on /api/v1/classes)
// Gắn tạm vào root bằng mergeParams nên sẽ định nghĩa path đầy đủ
// ==========================================

// GET /:classId/export
classesFeedbackRouter.get(
  "/:classId/export",
  authMiddleware,
  requireRoles(["DIRECTOR", "ACADEMIC", "TEACHER"]),
  controller.exportFeedbackByClass.bind(controller)
);

// POST /:classId/export/jobs
classesFeedbackRouter.post(
  "/:classId/export/jobs",
  authMiddleware,
  requireRoles(["DIRECTOR", "ACADEMIC", "TEACHER"]),
  controller.createExportFeedbackJob.bind(controller)
);

// GET /:classId/export/jobs/:jobId
classesFeedbackRouter.get(
  "/:classId/export/jobs/:jobId",
  authMiddleware,
  requireRoles(["DIRECTOR", "ACADEMIC", "TEACHER"]),
  controller.getExportFeedbackJob.bind(controller)
);

// POST /:classId/export/jobs/:jobId/cancel
classesFeedbackRouter.post(
  "/:classId/export/jobs/:jobId/cancel",
  authMiddleware,
  requireRoles(["DIRECTOR", "ACADEMIC", "TEACHER"]),
  controller.cancelExportFeedbackJob.bind(controller)
);

// POST /:classId/export/jobs/:jobId/retry
classesFeedbackRouter.post(
  "/:classId/export/jobs/:jobId/retry",
  authMiddleware,
  requireRoles(["DIRECTOR", "ACADEMIC", "TEACHER"]),
  controller.retryExportFeedbackJob.bind(controller)
);

// GET /:classId/export/jobs/:jobId/download
classesFeedbackRouter.get(
  "/:classId/export/jobs/:jobId/download",
  authMiddleware,
  requireRoles(["DIRECTOR", "ACADEMIC", "TEACHER"]),
  controller.downloadExportFeedbackJob.bind(controller)
);

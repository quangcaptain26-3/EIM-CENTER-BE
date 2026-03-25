import { Request, Response, NextFunction, Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermissions } from "../../middlewares/rbac.middleware";
import { RBAC_PERMISSIONS } from "../../../../shared/security/rbac.policy";
import { CreateTrialSchema, ExportTrialsSchema, ListTrialsSchema, UpdateTrialSchema } from "../../../../application/trials/dtos/trial.dto";
import { ScheduleTrialSchema } from "../../../../application/trials/dtos/schedule.dto";
import { ConvertTrialSchema } from "../../../../application/trials/dtos/convert.dto";

const trialsRouter = Router();

// ==========================================
// THIẾT LẬP ROUTE VÀ middleware
// ==========================================
// Blueprint tối thiểu:
// - Trials là module tuyển sinh → chỉ các vai trò liên quan mới được truy cập.
// - FE có thể ẩn/hiện theo UX, nhưng BE vẫn là lớp enforce cuối.
const READ_PERMISSIONS = [RBAC_PERMISSIONS.TRIALS_READ];
const WRITE_PERMISSIONS = [RBAC_PERMISSIONS.TRIALS_WRITE];

// 1. Lấy danh sách Trial Leads
// Request: GET /api/v1/trials?status=NEW&limit=10
// Response: { success: true, data: { items: [...], total: 10, limit: 10, offset: 0 } }
trialsRouter.get(
  "/",
  authMiddleware,
  requirePermissions(READ_PERMISSIONS),
  validate(z.object({ query: ListTrialsSchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { listTrialsUseCase } = req.app.locals.container.trials;
      const result = await listTrialsUseCase.execute(req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// EXPORT TRIALS
// ==========================================
// GET /api/v1/trials/export
trialsRouter.get(
  "/export",
  authMiddleware,
  requirePermissions(READ_PERMISSIONS),
  validate(z.object({ query: ExportTrialsSchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { exportTrialsUseCase } = req.app.locals.container.trials;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="trials-${dateStr}.xlsx"`,
      );

      await exportTrialsUseCase.stream(req.query, res);
      return res.end();
    } catch (error) {
      return next(error);
    }
  }
);

// 2. Tạo mới Trial Lead
// Request: POST /api/v1/trials - Body: { "fullName": "Nguyễn Văn A", "phone": "0912345678", "source": "FB" }
// Response: { success: true, data: { id: "...", fullName: "...", status: "NEW", ... } }
trialsRouter.post(
  "/",
  authMiddleware,
  requirePermissions(WRITE_PERMISSIONS),
  validate(z.object({ body: CreateTrialSchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Lưu ý: authMiddleware gắn thông tin tại req.user.userId
      const actorId = req.user?.userId;
      const { createTrialUseCase } = req.app.locals.container.trials;
      const lead = await createTrialUseCase.execute(req.body, actorId);
      res.status(201).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }
);

// 3. Lấy chi tiết Trial Lead
// Request: GET /api/v1/trials/123e4567-e89b-12d3-a456-426614174000
// Response: { success: true, data: { id: "...", schedule: { ... } } }
trialsRouter.get(
  "/:id",
  authMiddleware,
  requirePermissions(READ_PERMISSIONS),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { getTrialUseCase } = req.app.locals.container.trials;
      const lead = await getTrialUseCase.execute(req.params.id);
      res.status(200).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }
);

// 4. Cập nhật Trial Lead
// Request: PATCH /api/v1/trials/123e... - Body: { "note": "Khách hỏi học phí" }
// Response: { success: true, data: { ... } }
trialsRouter.patch(
  "/:id",
  authMiddleware,
  requirePermissions(WRITE_PERMISSIONS),
  validate(z.object({ body: UpdateTrialSchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { updateTrialUseCase } = req.app.locals.container.trials;
      const updated = await updateTrialUseCase.execute(req.params.id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// 5. Đặt lịch / Cập nhật lịch học thử
// Request: POST /api/v1/trials/123e.../schedule - Body: { "classId": "...", "trialDate": "2024-09-02T18:00:00Z" }
// Response: { success: true, data: { lead: { ...status: "SCHEDULED" }, schedule: { ... } } }
trialsRouter.post(
  "/:id/schedule",
  authMiddleware,
  requirePermissions(WRITE_PERMISSIONS),
  validate(z.object({ body: ScheduleTrialSchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scheduleTrialUseCase } = req.app.locals.container.trials;
      const { auditWriter } = req.app.locals.container.system;
      const actorUserId = req.user?.userId;
      const schedule = await scheduleTrialUseCase.execute(req.params.id, req.body);

      // Audit: đặt lịch học thử là hành động cần trace (ai đặt, lớp nào, thời điểm nào).
      await auditWriter.write(actorUserId, "TRIAL_SCHEDULE_UPSERT", "trial", req.params.id, {
        classId: req.body.classId,
        trialDate: req.body.trialDate,
      });
      res.status(200).json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }
);

// 6. Chuyển đổi trạng thái Trial Lead sang CONVERTED (Tạo Student + Enrollment)
// Request: POST /api/v1/trials/123e.../convert 
// Body: { "student": { "fullName": "Nguyễn Văn A", "phone": "09123" }, "classId": "..." }
// Response: { success: true, data: { message: "...", conversion: { ... }, studentId: "...", enrollmentId: "..." } }
trialsRouter.post(
  "/:id/convert",
  authMiddleware,
  requirePermissions(WRITE_PERMISSIONS),
  validate(z.object({ body: ConvertTrialSchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { convertTrialUseCase } = req.app.locals.container.trials;
      const { auditWriter } = req.app.locals.container.system;
      const actorUserId = req.user?.userId;
      const result = await convertTrialUseCase.execute(req.params.id, req.body, actorUserId);

      // Audit là lớp phụ trợ, không được làm fail response sau khi convert đã commit.
      try {
        await auditWriter.write(actorUserId, "convert", "trial_lead", req.params.id, {
          studentId: result.studentId,
          enrollmentId: result.enrollmentId,
          classId: req.body.classId ?? null,
        });
      } catch (auditError) {
        console.error("[TRIAL_CONVERT][AUDIT_WRITE_FAILED]", {
          trialId: req.params.id,
          actorUserId: actorUserId ?? null,
          error: auditError,
        });
      }
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export { trialsRouter };

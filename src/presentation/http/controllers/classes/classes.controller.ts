import { Request, Response, NextFunction, Router } from "express";
import {
  createClassBodySchema,
  listClassesQuerySchema,
  updateClassBodySchema,
  addEnrollmentBodySchema,
} from "../../../../application/classes/dtos/class.dto";
import { promoteClassBodySchema } from "../../../../application/classes/dtos/promotion.dto";
import { upsertSchedulesBodySchema } from "../../../../application/classes/dtos/schedule.dto";
import { assignStaffBodySchema } from "../../../../application/classes/dtos/staff.dto";
import { validate } from "../../middlewares/validate.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRoles } from "../../middlewares/rbac.middleware";

/**
 * Classes Controller
 * Quản lý các route liên quan đến Lớp học (Classes), Lịch học và Nhân sự.
 */
const classesRouter = Router();

// ============================================
// Định nghĩa Middleware Roles cho Module Classes
// ============================================
// Quyền ghi (Write): Tạo, sửa Classes, Schedules, Staff (DIRECTOR read-only theo thiết kế)
const WRITE_ROLES = ["ROOT", "ACADEMIC"];
// Quyền đọc (Read): Xem danh sách, chi tiết, roster
const READ_ROLES = ["ROOT", "DIRECTOR", "ACADEMIC", "SALES", "ACCOUNTANT", "TEACHER"];

// Áp dụng middleware xác thực token chung cho toàn bộ router
classesRouter.use(authMiddleware);

// ============================================
// [GET] /classes
// Danh sách lớp học có phân trang & filter
// ============================================
classesRouter.get(
  "/",
  requireRoles(READ_ROLES),
  validate(listClassesQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { listClassesUseCase } = req.app.locals.container.classes;
      const result = await listClassesUseCase.execute(req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [POST] /classes
// Tạo lớp học mới
// ============================================
classesRouter.post(
  "/",
  requireRoles(WRITE_ROLES),
  validate(createClassBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { createClassUseCase } = req.app.locals.container.classes;
      const { upsertSchedulesUseCase } = req.app.locals.container.classes;
      const { generateSessionsUseCase } = req.app.locals.container.sessions;
      const { auditWriter } = req.app.locals.container.system;
      const newClass = await createClassUseCase.execute(req.body);

      const schedules = req.body?.schedules;
      const autoGenerateSessions = req.body?.autoGenerateSessions !== false;
      const generateWeeks = req.body?.generateWeeks;
      const generateUntilUnitNo = req.body?.generateUntilUnitNo;

      if (Array.isArray(schedules) && schedules.length > 0) {
        await upsertSchedulesUseCase.execute(newClass.id, { schedules });
      }

      let generatedSessionsCount = 0;
      if (autoGenerateSessions) {
        const generated = await generateSessionsUseCase.execute(newClass.id, {
          weeks: generateWeeks,
          untilUnitNo: generateUntilUnitNo,
        });
        generatedSessionsCount = generated.length;
      }

      // Audit: tạo lớp là hành động write quan trọng, log metadata tối thiểu.
      await auditWriter.write(req.user?.userId, "CLASS_CREATE", "class", newClass.id, {
        code: newClass.code,
        name: newClass.name,
        programId: newClass.programId,
        capacity: newClass.capacity,
        startDate: newClass.startDate,
        status: newClass.status,
        autoGenerateSessions,
        generatedSessionsCount,
      });
      res.status(201).json({
        success: true,
        data: {
          ...newClass,
          generatedSessionsCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [GET] /classes/:id
// Chi tiết lớp học (kèm schedules & staff)
// ============================================
classesRouter.get(
  "/:id",
  requireRoles(READ_ROLES),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { getClassUseCase } = req.app.locals.container.classes;
      const classDetail = await getClassUseCase.execute(req.params.id);
      res.json({ success: true, data: classDetail });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [PATCH] /classes/:id
// Cập nhật thông tin lớp học
// ============================================
classesRouter.patch(
  "/:id",
  requireRoles(WRITE_ROLES),
  validate(updateClassBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { updateClassUseCase, getClassUseCase } = req.app.locals.container.classes;
      const { auditWriter } = req.app.locals.container.system;

      // Lấy snapshot trước khi update để audit diff tối thiểu (không log thông tin thừa).
      const before = await getClassUseCase.execute(req.params.id);
      const updated = await updateClassUseCase.execute(req.params.id, req.body);

      await auditWriter.write(req.user?.userId, "CLASS_UPDATE", "class", updated.id, {
        before: {
          name: before.name,
          room: before.room ?? null,
          capacity: before.capacity,
          startDate: before.startDate,
          status: before.status,
        },
        after: {
          name: updated.name,
          room: updated.room ?? null,
          capacity: updated.capacity,
          startDate: updated.startDate,
          status: updated.status,
        },
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [PUT] /classes/:id/schedules
// Cập nhật lịch học (Upsert)
// ============================================
classesRouter.put(
  "/:id/schedules",
  requireRoles(WRITE_ROLES),
  validate(upsertSchedulesBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { upsertSchedulesUseCase } = req.app.locals.container.classes;
      const { classStaffRepo } = req.app.locals.container.classes;
      const { auditWriter, notificationRepo } = req.app.locals.container.system;
      const schedules = await upsertSchedulesUseCase.execute(req.params.id, req.body);

      // Audit: thay đổi lịch học ảnh hưởng generate sessions, log số lượng & payload schedule.
      await auditWriter.write(req.user?.userId, "CLASS_SCHEDULE_UPSERT", "class_schedule", req.params.id, {
        classId: req.params.id,
        schedules: req.body.schedules,
      });

      // Notifications tối thiểu: đẩy cho toàn bộ giáo viên của lớp (MAIN/TA) để họ nắm thay đổi.
      const staff = await classStaffRepo.listStaff(req.params.id);
      const uniqueTeacherIds = Array.from(new Set(staff.map((s: { userId: string }) => s.userId)));
      await Promise.all(
        uniqueTeacherIds.map((userId) =>
          notificationRepo.create({
            userId,
            title: "Lịch học của lớp đã thay đổi",
            body: `Lịch học của lớp ${req.params.id} vừa được cập nhật. Vui lòng kiểm tra lại các buổi dạy.`,
          })
        )
      );

      res.json({ success: true, data: schedules });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [GET] /classes/:id/schedule (Alias)
// ============================================
classesRouter.get(
  "/:id/schedule",
  requireRoles(READ_ROLES),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { getClassUseCase } = req.app.locals.container.classes;
      const classDetail = await getClassUseCase.execute(req.params.id);
      res.json({ success: true, data: classDetail.schedules });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [POST] /classes/:id/staff
// Phân công staff/giáo viên
// ============================================
classesRouter.post(
  "/:id/staff",
  requireRoles(WRITE_ROLES),
  validate(assignStaffBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { assignStaffUseCase } = req.app.locals.container.classes;
      const { auditWriter } = req.app.locals.container.system;
      const staff = await assignStaffUseCase.execute(req.params.id, req.body);

      // Audit: phân công nhân sự lớp (MAIN/TA).
      await auditWriter.write(req.user?.userId, "CLASS_STAFF_ASSIGN", "class_staff", staff.id, {
        classId: staff.classId,
        userId: staff.userId,
        type: staff.type,
      });
      res.json({ success: true, data: staff });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [DELETE] /classes/:id/staff
// Hủy phân công staff (Dùng Body để truyền userId, type)
// ============================================
classesRouter.delete(
  "/:id/staff",
  requireRoles(WRITE_ROLES),
  validate(assignStaffBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { removeStaffUseCase } = req.app.locals.container.classes;
      const { auditWriter } = req.app.locals.container.system;
      const { userId, type } = req.body;
      await removeStaffUseCase.execute(req.params.id, userId, type);

      // Audit: hủy phân công nhân sự lớp.
      await auditWriter.write(req.user?.userId, "CLASS_STAFF_REMOVE", "class_staff", req.params.id, {
        classId: req.params.id,
        userId,
        type,
      });
      res.json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [GET] /classes/:id/roster
// Danh sách học viên trong lớp
// ============================================
classesRouter.get(
  "/:id/roster",
  requireRoles(READ_ROLES),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { getRosterUseCase } = req.app.locals.container.classes;
      const roster = await getRosterUseCase.execute(req.params.id);
      res.json({ success: true, data: roster });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [POST] /classes/:id/enrollments
// Thêm học viên vào lớp (Tạo mới hoặc chuyển)
// ============================================
classesRouter.post(
  "/:id/enrollments",
  requireRoles(WRITE_ROLES), // ACADEMIC, ROOT
  validate(addEnrollmentBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { addEnrollmentToClassUseCase } = req.app.locals.container.classes;
      const { auditWriter } = req.app.locals.container.system;
      const actorUserId = req.user?.userId ?? null;
      const result = await addEnrollmentToClassUseCase.execute(req.params.id, req.body, actorUserId);

      // Audit: add/transfer enrollment vào lớp là hành động nhạy cảm (liên quan capacity/finance).
      await auditWriter.write(req.user?.userId, "CLASS_ENROLLMENT_ADD", "enrollment", result?.id, {
        classId: req.params.id,
        enrollmentId: req.body.enrollmentId ?? null,
        studentId: req.body.studentId ?? null,
        startDate: req.body.startDate ?? null,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [POST] /classes/:id/close
// Đóng lớp học
// ============================================
classesRouter.post(
  "/:id/close",
  requireRoles(WRITE_ROLES),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { closeClassUseCase } = req.app.locals.container.classes;
      const actorUserId = req.user?.userId;
      const updatedClass = await closeClassUseCase.execute(req.params.id, actorUserId);
      res.json({ success: true, data: updatedClass });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [POST] /classes/:id/promotion
// Promotion học viên sang lớp mới
// ============================================
classesRouter.post(
  "/:id/promotion",
  requireRoles(WRITE_ROLES),
  validate(promoteClassBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { promoteClassUseCase } = req.app.locals.container.classes;
      const { auditWriter } = req.app.locals.container.system;
      const actorUserId = req.user?.userId;
      const result = await promoteClassUseCase.execute(req.params.id, req.body, actorUserId);

      await auditWriter.write(actorUserId, "CLASS_PROMOTION", "class", req.params.id, {
        fromClassId: req.params.id,
        toClassId: req.body.toClassId,
        promotedCount: result.promotedCount,
        closedSourceClass: result.closedSourceClass,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

export { classesRouter };

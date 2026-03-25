import { Request, Response, NextFunction, Router } from 'express';
import { z } from 'zod';
import { CreateStudentBodySchema, UpdateStudentBodySchema, ListStudentsQuerySchema, ExportStudentsQuerySchema } from '../../../../application/students/dtos/student.dto';
import { validate } from '../../middlewares/validate.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermissions, requireRoles } from '../../middlewares/rbac.middleware';
import { RBAC_PERMISSIONS } from '../../../../shared/security/rbac.policy';

/**
 * Students Controller
 */
const studentsRouter = Router();

const WRITE_PERMISSIONS = [RBAC_PERMISSIONS.STUDENT_WRITE];
const READ_PERMISSIONS = [RBAC_PERMISSIONS.STUDENT_READ];
// Defense-in-depth: chỉ cho phép ROOT/ACADEMIC tạo/sửa học viên/ghi danh.
const WRITE_ROLES = ['ROOT', 'ACADEMIC'];

// [GET] /students
studentsRouter.get(
  '/',
  authMiddleware,
  requirePermissions(READ_PERMISSIONS),
  validate(z.object({ query: ListStudentsQuerySchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { listStudentsUseCase } = req.app.locals.container.students;
      const result = await listStudentsUseCase.execute(req.query);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// [GET] /students/export
studentsRouter.get(
  '/export',
  authMiddleware,
  requirePermissions(READ_PERMISSIONS),
  validate(z.object({ query: ExportStudentsQuerySchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { exportStudentsUseCase } = req.app.locals.container.students;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="students-${dateStr}.xlsx"`,
      );

      await exportStudentsUseCase.stream(req.query, res);
      return res.end();
    } catch (error) {
      next(error);
    }
  }
);

// [POST] /students
studentsRouter.post(
  '/',
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  validate(z.object({ body: CreateStudentBodySchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { createStudentUseCase } = req.app.locals.container.students;
      const { auditWriter, notificationRepo } = req.app.locals.container.system;
      const actorUserId = req.user?.userId;
      const newStudent = await createStudentUseCase.execute(req.body);

      // Audit: tạo học viên là hành động nhạy cảm (PII), log tối thiểu.
      await auditWriter.write(actorUserId, "STUDENT_CREATE", "student", newStudent.id, {
        fullName: newStudent.fullName,
        phone: newStudent.phone ?? null,
        email: newStudent.email ?? null,
      });

      // Notification tối thiểu: tạo "inbox activity" cho người thao tác.
      if (actorUserId) {
        await notificationRepo.create({
          userId: actorUserId,
          title: "Đã tạo học viên",
          body: `Bạn đã tạo học viên: ${newStudent.fullName}`,
        });
      }
      
      res.status(201).json({
        success: true,
        data: newStudent,
      });
    } catch (error) {
      next(error);
    }
  }
);

// [GET] /students/:id
studentsRouter.get(
  '/:id',
  authMiddleware,
  requirePermissions(READ_PERMISSIONS),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { getStudentUseCase } = req.app.locals.container.students;
      const student = await getStudentUseCase.execute(req.params.id);
      
      res.json({
        success: true,
        data: student,
      });
    } catch (error) {
      next(error);
    }
  }
);

// [PATCH] /students/:id
studentsRouter.patch(
  '/:id',
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  validate(z.object({ body: UpdateStudentBodySchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { updateStudentUseCase } = req.app.locals.container.students;
      const { getStudentUseCase } = req.app.locals.container.students;
      const { auditWriter, notificationRepo } = req.app.locals.container.system;
      const actorUserId = req.user?.userId;

      const before = await getStudentUseCase.execute(req.params.id);
      const updatedStudent = await updateStudentUseCase.execute(req.params.id, req.body);

      await auditWriter.write(actorUserId, "STUDENT_UPDATE", "student", updatedStudent.id, {
        before: {
          fullName: before.fullName,
          phone: before.phone ?? null,
          email: before.email ?? null,
        },
        after: {
          fullName: updatedStudent.fullName,
          phone: updatedStudent.phone ?? null,
          email: updatedStudent.email ?? null,
        },
      });

      if (actorUserId) {
        await notificationRepo.create({
          userId: actorUserId,
          title: "Đã cập nhật học viên",
          body: `Bạn đã cập nhật học viên: ${updatedStudent.fullName}`,
        });
      }
      
      res.json({
        success: true,
        data: updatedStudent,
      });
    } catch (error) {
      next(error);
    }
  }
);

// [GET] /students/:id/enrollments
studentsRouter.get(
  '/:id/enrollments',
  authMiddleware,
  requirePermissions(READ_PERMISSIONS),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { listStudentEnrollmentsUseCase } = req.app.locals.container.students;
      const includeAttendanceSummary =
        req.query.includeAttendanceSummary === 'true' || req.query.includeAttendanceSummary === '1';
      const enrollments = await listStudentEnrollmentsUseCase.execute(req.params.id, {
        includeAttendanceSummary,
      });
      res.json({
        success: true,
        data: enrollments,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { studentsRouter };

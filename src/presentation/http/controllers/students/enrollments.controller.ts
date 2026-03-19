import { Request, Response, NextFunction, Router } from 'express';
import { z } from 'zod';
import { CreateEnrollmentBodySchema, UpdateEnrollmentStatusBodySchema, TransferEnrollmentBodySchema } from '../../../../application/students/dtos/enrollment.dto';
import { validate } from '../../middlewares/validate.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermissions, requireRoles } from '../../middlewares/rbac.middleware';
import { RBAC_PERMISSIONS } from '../../../../shared/security/rbac.policy';

/**
 * Enrollments Controller
 */
const enrollmentsRouter = Router();

const WRITE_PERMISSIONS = [RBAC_PERMISSIONS.STUDENT_WRITE];
// Defense-in-depth:
// - Chỉ ROOT/ACADEMIC mới được ghi danh / chuyển lớp (loại bỏ rủi ro nếu permission bị cấp sai cho DIRECTOR/SALES/ACCOUNTANT).
const WRITE_ROLES = ['ROOT', 'ACADEMIC'];

// [POST] /enrollments
enrollmentsRouter.post(
  '/',
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  validate(z.object({ body: CreateEnrollmentBodySchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { createEnrollmentUseCase } = req.app.locals.container.students;
      const { auditWriter } = req.app.locals.container.system;
      const actorUserId = req.user?.userId;
      const newEnrollment = await createEnrollmentUseCase.execute(req.body, actorUserId);

      // Audit: tạo enrollment để trace việc "ghi danh trước, xếp lớp sau" (nếu classId null).
      await auditWriter.write(actorUserId, "ENROLLMENT_CREATE", "enrollment", newEnrollment.id, {
        studentId: newEnrollment.studentId,
        classId: newEnrollment.classId,
        status: newEnrollment.status,
        startDate: newEnrollment.startDate,
      });
      
      res.status(201).json({
        success: true,
        data: newEnrollment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// [PATCH] /enrollments/:id/status
enrollmentsRouter.patch(
  '/:id/status',
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  validate(z.object({ body: UpdateEnrollmentStatusBodySchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { updateEnrollmentStatusUseCase } = req.app.locals.container.students;
      const { auditWriter } = req.app.locals.container.system;
      const actorUserId = req.user?.userId;
      const updatedEnrollment = await updateEnrollmentStatusUseCase.execute(req.params.id, req.body, actorUserId);

      // Audit: đổi trạng thái enrollment là hành động nhạy cảm, log trước/sau tối thiểu.
      await auditWriter.write(actorUserId, "ENROLLMENT_STATUS_UPDATE", "enrollment", updatedEnrollment.id, {
        toStatus: updatedEnrollment.status,
        note: req.body.note ?? null,
      });
      
      res.json({
        success: true,
        data: updatedEnrollment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// [POST] /enrollments/:id/transfer
enrollmentsRouter.post(
  '/:id/transfer',
  authMiddleware,
  requireRoles(WRITE_ROLES),
  requirePermissions(WRITE_PERMISSIONS),
  validate(z.object({ body: TransferEnrollmentBodySchema })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transferEnrollmentUseCase } = req.app.locals.container.students;
      const { auditWriter } = req.app.locals.container.system;
      const actorUserId = req.user?.userId;
      const result = await transferEnrollmentUseCase.execute(req.params.id, req.body, actorUserId);

      // Audit: chuyển lớp là hành động nhạy cảm, log enrollmentId cũ/mới và lớp đích.
      await auditWriter.write(actorUserId, "ENROLLMENT_TRANSFER", "enrollment", req.params.id, {
        toClassId: req.body.toClassId,
        oldEnrollmentId: result.oldEnrollment?.id,
        newEnrollmentId: result.newEnrollment?.id,
      });
      
      res.json({
        success: true,
        data: result, // { oldEnrollment, newEnrollment }
      });
    } catch (error) {
      next(error);
    }
  }
);

export { enrollmentsRouter };

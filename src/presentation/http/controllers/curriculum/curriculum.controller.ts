import { Request, Response, NextFunction, Router } from 'express';
import { CreateProgramBodySchema, UpdateProgramBodySchema } from '../../../../application/curriculum/dtos/program.dto';
import { CreateUnitBodySchema, UpdateUnitBodySchema } from '../../../../application/curriculum/dtos/unit.dto';
import { validate } from '../../middlewares/validate.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRoles } from '../../middlewares/rbac.middleware';

import {
  CurriculumExportQuerySchema,
  CurriculumImportBodySchema,
} from '../../../../application/curriculum/dtos/curriculum-import-export.dto';

/**
 * Curriculum Controller
 * Quản lý các route liên quan đến Chương trình học (Programs) và bài học (Units).
 * Lấy Use Cases từ app.locals.container (được inject ở config server)
 */
const curriculumRouter = Router();

// ============================================
// Định nghĩa Middleware Roles cho Module Curriculum
// ============================================
// Quyền ghi (Write): Tạo, sửa Programs/Units
const WRITE_ROLES = ['ROOT', 'DIRECTOR', 'ACADEMIC'];
// Quyền đọc (Read): Xem danh sách, chi tiết
const READ_ROLES = ['ROOT', 'DIRECTOR', 'ACADEMIC', 'SALES', 'ACCOUNTANT', 'TEACHER'];


// ============================================
// [GET] /curriculum/programs
// ============================================
curriculumRouter.get(
  '/programs',
  authMiddleware,
  requireRoles(READ_ROLES),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { listProgramsUseCase } = req.app.locals.container.curriculum;
      const programs = await listProgramsUseCase.execute();
      
      res.json({
        success: true,
        data: programs,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [POST] /curriculum/programs
// ============================================
curriculumRouter.post(
  '/programs',
  authMiddleware,
  requireRoles(WRITE_ROLES),
  validate(CreateProgramBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { createProgramUseCase } = req.app.locals.container.curriculum;
      const newProgram = await createProgramUseCase.execute(req.body);
      
      res.status(201).json({
        success: true,
        data: newProgram,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [GET] /curriculum/programs/:id
// ============================================
curriculumRouter.get(
  '/programs/:id',
  authMiddleware,
  requireRoles(READ_ROLES),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { getProgramUseCase } = req.app.locals.container.curriculum;
      const program = await getProgramUseCase.execute(req.params.id);
      
      res.json({
        success: true,
        data: program,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [PATCH] /curriculum/programs/:id
// ============================================
curriculumRouter.patch(
  '/programs/:id',
  authMiddleware,
  requireRoles(WRITE_ROLES),
  validate(UpdateProgramBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { updateProgramUseCase } = req.app.locals.container.curriculum;
      const updatedProgram = await updateProgramUseCase.execute(req.params.id, req.body);
      
      res.json({
        success: true,
        data: updatedProgram,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ====================================================
// CURRICULUM EXPORT/IMPORT (JSON Contract)
// ====================================================

// [GET] /curriculum/export
curriculumRouter.get(
  "/export",
  authMiddleware,
  requireRoles(READ_ROLES),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedQuery = CurriculumExportQuerySchema.parse(req.query);
      const { scope, programCodes } = parsedQuery;
      const programCodeList = programCodes
        ? programCodes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const { exportCurriculumUseCase } = req.app.locals.container.curriculum;
      const data = await exportCurriculumUseCase.execute({
        scope,
        programCodes: programCodeList,
      });

      return res.json({ success: true, data });
    } catch (error) {
      // Giữ behavior lỗi thống nhất qua middleware error-handler.
      return next(error);
    }
  },
);

// [POST] /curriculum/import
curriculumRouter.post(
  "/import",
  authMiddleware,
  requireRoles(WRITE_ROLES),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = CurriculumImportBodySchema.parse(req.body);
      const { importCurriculumUseCase } = req.app.locals.container.curriculum;
      const data = await importCurriculumUseCase.execute(body);
      return res.json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  },
);


// ============================================
// [GET] /curriculum/programs/:id/units
// Lấy danh sách units của một program cụ thể
// ============================================
curriculumRouter.get(
  '/programs/:id/units',
  authMiddleware,
  requireRoles(READ_ROLES),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { listUnitsUseCase } = req.app.locals.container.curriculum;
      const units = await listUnitsUseCase.execute(req.params.id);
      
      res.json({
        success: true,
        data: units,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [POST] /curriculum/programs/:id/units
// Thêm 1 Unit mới cho Error, đồng thời tạo luôn default lessons
// ============================================
curriculumRouter.post(
  '/programs/:id/units',
  authMiddleware,
  requireRoles(WRITE_ROLES),
  validate(CreateUnitBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { createUnitUseCase } = req.app.locals.container.curriculum;
      const newUnit = await createUnitUseCase.execute(req.params.id, req.body);
      
      res.status(201).json({
        success: true,
        data: newUnit, // Sẽ có kèm thuộc tính 'lessons' trong object response
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [GET] /curriculum/units/:unitId
// Lấy thông tin Unit kèm danh sách Lessons
// ============================================
curriculumRouter.get(
  '/units/:unitId',
  authMiddleware,
  requireRoles(READ_ROLES),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { getUnitUseCase } = req.app.locals.container.curriculum;
      const unit = await getUnitUseCase.execute(req.params.unitId);
      
      res.json({
        success: true,
        data: unit,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// [PATCH] /curriculum/units/:unitId
// ============================================
curriculumRouter.patch(
  '/units/:unitId',
  authMiddleware,
  requireRoles(WRITE_ROLES),
  validate(UpdateUnitBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { updateUnitUseCase } = req.app.locals.container.curriculum;
      const updatedUnit = await updateUnitUseCase.execute(req.params.unitId, req.body);
      
      res.json({
        success: true,
        data: updatedUnit,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { curriculumRouter };

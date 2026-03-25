import type { NextFunction, Request, Response } from 'express';

import { buildContainer } from '../../../bootstrap/container';
import { AppError } from '../../../shared/errors/app-error';
import { teacherCanWriteSession } from '../../../domain/feedback/services/teacher-ownership.rule';

/**
 * Bộ middleware chuyên để khóa IDOR cho các luồng của TEACHER.
 *
 * Quy ước:
 * - Nếu user có role TEACHER (dù kèm các role khác), vẫn phải áp ownership chặt.
 * - Không phụ thuộc vào thứ tự roles để tránh RBAC drift.
 *
 * QUAN TRỌNG — Không check class_staff:
 * - Chỉ check session.mainTeacherId và session.coverTeacherId (teacher_effective_id).
 * - Teacher được gán vào lớp (class_staff) nhưng KHÔNG cover buổi đó → KHÔNG được submit feedback.
 * - Tránh: Teacher A được add class_staff nhưng buổi do Teacher B dạy, A vẫn submit được (IDOR).
 */
function isTeacher(req: Request): boolean {
  return Boolean(req.user && Array.isArray(req.user.roles) && req.user.roles.includes('TEACHER'));
}

/**
 * Chặn teacher truy cập tài nguyên của người khác qua param.
 * Ví dụ: GET /sessions/teacher/:teacherId → teacherId bắt buộc phải == req.user.userId.
 */
export function enforceTeacherSelfParam(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Vui lòng đăng nhập để thực hiện hành động này');
      }

      // Chỉ khóa chặt cho TEACHER để tránh ảnh hưởng các role quản trị.
      if (!isTeacher(req)) {
        return next();
      }

      const targetId = String(req.params[paramName] ?? '');
      if (!targetId || targetId !== req.user.userId) {
        throw AppError.forbidden('Giáo viên chỉ được truy cập dữ liệu của chính mình', {
          code: 'RBAC/TEACHER_SELF_ONLY',
          paramName,
          targetId,
          actorId: req.user.userId,
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Chặn teacher GHI (submit feedback/scores) vào session không do mình dạy.
 * Check teacher_effective_id = coverTeacherId ?? mainTeacherId — KHÔNG dùng class_staff.
 * POST /feedback/upsert, POST /feedback/import, POST /scores/upsert bắt buộc dùng.
 */
export async function enforceTeacherOwnsSession(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw AppError.unauthorized('Vui lòng đăng nhập để thực hiện hành động này');
    }
    if (!isTeacher(req)) {
      return next();
    }

    const sessionId = String(req.params.sessionId ?? '');
    if (!sessionId) {
      throw AppError.badRequest('sessionId is required');
    }

    const container = buildContainer();
    const session = await container.sessions.getSessionUseCase.execute(sessionId);

    const canAccess = teacherCanWriteSession(
      { mainTeacherId: session.mainTeacherId, coverTeacherId: session.coverTeacherId },
      req.user.userId,
    );
    if (!canAccess) {
      throw AppError.forbidden('Giáo viên chỉ được truy cập buổi học mình phụ trách', {
        code: 'RBAC/TEACHER_SESSION_OWNERSHIP_REQUIRED',
        sessionId,
        actorId: req.user.userId,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Teacher xem feedback (READ): rule lỏng hơn write.
 * Cho phép nếu: (a) main/cover buổi đó, hoặc (b) class_staff của lớp, hoặc (c) main/cover bất kỳ buổi nào trong lớp.
 * Áp dụng cho GET /feedback, GET /feedback/template.
 */
export async function enforceTeacherCanReadSession(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw AppError.unauthorized('Vui lòng đăng nhập để thực hiện hành động này');
    }
    if (!isTeacher(req)) {
      return next();
    }

    const sessionId = String(req.params.sessionId ?? '');
    if (!sessionId) {
      throw AppError.badRequest('sessionId is required');
    }

    const container = buildContainer();
    const session = await container.sessions.getSessionUseCase.execute(sessionId);
    const teacherId = req.user!.userId;

    // (a) Main/cover buổi đó
    if (teacherCanWriteSession(session, teacherId)) {
      return next();
    }

    // (b) Class_staff của lớp
    const isStaff = await container.classes.classStaffRepo.isTeacherOfClass(teacherId, session.classId);
    if (isStaff) {
      return next();
    }

    // (c) Main/cover bất kỳ buổi nào trong lớp (vd: cover 1 buổi → xem toàn bộ feedback lịch sử)
    const classSessions = await container.sessions.sessionRepo.listByClass(session.classId);
    const hasAnySession = classSessions.some(
      (s) => s.mainTeacherId === teacherId || s.coverTeacherId === teacherId,
    );
    if (hasAnySession) {
      return next();
    }

    throw AppError.forbidden('Giáo viên không có quyền xem feedback buổi học này', {
      code: 'RBAC/TEACHER_READ_SESSION_REQUIRED',
      sessionId,
      actorId: teacherId,
    });
  } catch (error) {
    return next(error);
  }
}


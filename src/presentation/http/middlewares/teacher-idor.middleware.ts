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
 * Chặn teacher xem/ghi vào session không thuộc quyền dạy của mình (main/cover).
 * Áp dụng cho mọi endpoint có param `:sessionId`.
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


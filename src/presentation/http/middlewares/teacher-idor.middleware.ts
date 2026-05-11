import { Request, Response, NextFunction } from 'express';
import { ISessionRepo, ISessionCoverRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { IPayrollRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

/** ADMIN | ACADEMIC | ACCOUNTANT: truy cập đầy đủ resource buổi học. */
export function isAdminOrStaff(role: string): boolean {
  return role === 'ADMIN' || role === 'ACADEMIC' || role === 'ACCOUNTANT';
}

/** ADMIN/ACCOUNTANT xem mọi payroll; TEACHER chỉ xem dòng payroll của chính mình. */
export function isPayrollPrivileged(role: string): boolean {
  return role === 'ADMIN' || role === 'ACCOUNTANT';
}

/**
 * TEACHER chỉ được truy cập session khi khớp effective_teacher_id(sessionId).
 * ADMIN / ACADEMIC / ACCOUNTANT được phép bypass check self-scope.
 */
export function requireOwnSession(sessionRepo: ISessionRepo, _sessionCoverRepo: ISessionCoverRepo) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new AppError(ERROR_CODES.AUTH_TOKEN_INVALID, 'User is not authenticated', 401),
      );
    }
    const { role, id: userId } = req.user;
    if (isAdminOrStaff(role)) return next();
    if (role !== 'TEACHER') {
      return next(
        new AppError(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION, 'Insufficient permission to access this session', 403),
      );
    }

    const sessionId = String(req.params.id);
    const session = await sessionRepo.findById(sessionId);
    if (!session) {
      return next(new AppError(ERROR_CODES.NOT_FOUND, 'Session not found', 404));
    }

    // Theo rule IDOR: chỉ cho truy cập khi teacher hiện hành khớp effective_teacher_id(sessionId).
    const effectiveTeacherId = await sessionRepo.findEffectiveTeacherId(sessionId);
    if (effectiveTeacherId === userId) return next();

    return next(
      new AppError(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION, 'You may only access your own sessions', 403),
    );
  };
}

/**
 * GET /payroll/:id — TEACHER must own the payroll row; ADMIN / ACCOUNTANT may read any.
 */
export function requireOwnPayroll(payrollRepo: IPayrollRepo) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new AppError(ERROR_CODES.AUTH_TOKEN_INVALID, 'User is not authenticated', 401),
      );
    }
    const { role, id: userId } = req.user;
    if (isPayrollPrivileged(role)) return next();

    const payrollId = String(req.params.id);
    const payroll = await payrollRepo.findById(payrollId);
    if (!payroll) {
      return next(new AppError(ERROR_CODES.PAYROLL_NOT_FOUND, 'Payroll not found', 404));
    }

    if (role === 'TEACHER' && payroll.teacherId === userId) return next();

    return next(
      new AppError(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION, 'You may only access your own payroll records', 403),
    );
  };
}

import { Request, Response, NextFunction } from 'express';
import { ISessionRepo, ISessionCoverRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { IPayrollRepo } from '../../../domain/finance/repositories/receipt.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

/** ADMIN | ACADEMIC | ACCOUNTANT — full access to session resources (no teacher self-scope). */
export function isAdminOrStaff(role: string): boolean {
  return role === 'ADMIN' || role === 'ACADEMIC' || role === 'ACCOUNTANT';
}

/** Only ADMIN and ACCOUNTANT may read any payroll row; TEACHER must match payroll_records.teacher_id. */
export function isPayrollPrivileged(role: string): boolean {
  return role === 'ADMIN' || role === 'ACCOUNTANT';
}

function sessionMainTeacherId(session: { teacherId?: string; teacher_id?: string } | null): string | undefined {
  if (!session) return undefined;
  return session.teacherId ?? session.teacher_id;
}

/**
 * TEACHER may only access a session if they are the main teacher or the active cover teacher.
 * ADMIN / ACADEMIC / ACCOUNTANT bypass.
 */
export function requireOwnSession(sessionRepo: ISessionRepo, sessionCoverRepo: ISessionCoverRepo) {
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

    const mainId = sessionMainTeacherId(session as { teacherId?: string; teacher_id?: string });
    if (mainId === userId) return next();

    const cover = await sessionCoverRepo.findBySession(sessionId);
    const coverId = cover?.coverTeacherId;
    if (coverId === userId) return next();

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

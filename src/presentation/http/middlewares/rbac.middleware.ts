import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../shared/errors/app-error';
import { RbacService } from '../../../domain/auth/services/rbac.service';

/**
 * Middleware yêu cầu người dùng phải có TẤT CẢ các permissions được truyền vào
 */
export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Vui lòng đăng nhập để thực hiện hành động này');
      }

      const hasAccess = RbacService.hasPermissions(req.user.permissions, requiredPermissions);
      if (!hasAccess) {
        throw AppError.forbidden('Bạn không đủ quyền (permissions) để thực hiện hành động này');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware yêu cầu người dùng phải có ÍT NHẤT 1 trong các permission được truyền vào
 */
export const requireAnyPermission = (allowedPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Vui lòng đăng nhập để thực hiện hành động này');
      }

      const hasAccess = RbacService.hasAnyPermission(req.user.permissions, allowedPermissions);
      if (!hasAccess) {
        throw AppError.forbidden('Bạn không đủ quyền (permissions) để thực hiện hành động này');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware yêu cầu người dùng phải có ÍT NHẤT 1 role được truyền vào
 */
export const requireRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('Vui lòng đăng nhập để thực hiện hành động này');
      }

      const hasAccess = RbacService.hasAnyRole(req.user.roles, allowedRoles);
      if (!hasAccess) {
        throw AppError.forbidden('Role của bạn không có quyền thực hiện hành động này');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

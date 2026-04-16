import { Request, Response, NextFunction } from 'express';
import { RbacService } from '../../../domain/auth/services/rbac.service';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export function authorize(rbacService: RbacService, ...actions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new AppError(
          ERROR_CODES.AUTH_TOKEN_INVALID,
          'User is not authenticated',
          401
        )
      );
    }

    const { role } = req.user;

    // Check if the role has permission for AT LEAST ONE of the required actions
    // Or if actions is empty and user is just required to be authenticated
    if (actions.length === 0) {
      return next();
    }

    const hasPermission = actions.some(action => rbacService.canDo(role, action));
    
    // Exception for explicit '*' action required (if any specific API just says require '*')
    const explicitlyRequiresWildcard = actions.includes('*') && rbacService.canDo(role, '*');

    if (!hasPermission && !explicitlyRequiresWildcard) {
      return next(
        new AppError(
          ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
          'Insufficient permission to perform this action',
          403
        )
      );
    }

    next();
  };
}

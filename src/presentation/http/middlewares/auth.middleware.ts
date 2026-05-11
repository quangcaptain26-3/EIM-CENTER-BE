import { Request, Response, NextFunction } from 'express';
import { JwtProvider } from '../../../infrastructure/auth/jwt.provider';
import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userCode: string;
        role: string; // role code
        email: string;
        fullName: string;
      };
    }
  }
}

export function authMiddleware(jwtProvider: JwtProvider, userRepo: IUserRepo) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError(
          ERROR_CODES.AUTH_TOKEN_INVALID,
          'Missing or invalid authorization header',
          401
        );
      }

      const token = authHeader.split(' ')[1];
      const payload = jwtProvider.verifyAccess(token);
      if (!payload) {
        throw new AppError(
          ERROR_CODES.AUTH_TOKEN_INVALID,
          'Invalid or expired access token',
          401
        );
      }

      const user = await userRepo.findById(payload.userId);
      if (!user || user.isDeleted()) {
        throw new AppError(
          ERROR_CODES.AUTH_TOKEN_INVALID,
          'User not found or deleted',
          401
        );
      }

      if (!user.isActive) {
        throw new AppError(
          ERROR_CODES.AUTH_USER_INACTIVE,
          'User account is suspended',
          401
        );
      }

      req.user = {
        id: user.id,
        userCode: user.userCode,
        role: user.role.code,
        email: user.email,
        fullName: user.fullName,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

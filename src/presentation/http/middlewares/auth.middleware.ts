import { Request, Response, NextFunction } from 'express';
import { JwtProvider } from '../../../infrastructure/auth/jwt.provider';
import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import type { AuditWriter } from '../../../application/system/usecases/audit-writer';

const HTTP_MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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

export function authMiddleware(
  jwtProvider: JwtProvider,
  userRepo: IUserRepo,
  auditWriter?: AuditWriter,
) {
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

      if (auditWriter && HTTP_MUTATING.has(req.method)) {
        const actorIp = Array.isArray(req.ip) ? req.ip[0] : req.ip;
        const actorAgent = req.get('user-agent') ?? undefined;
        const pathForLog = (req.originalUrl || req.url || '').split('?')[0];
        res.once('finish', () => {
          const metadata: Record<string, unknown> = {
            method: req.method,
            path: pathForLog,
            statusCode: res.statusCode,
          };
          if ((req as { file?: unknown }).file) {
            metadata.multipartFile = true;
          } else if (
            req.body &&
            typeof req.body === 'object' &&
            !Buffer.isBuffer(req.body) &&
            !Array.isArray(req.body)
          ) {
            const body = req.body as Record<string, unknown>;
            const skip = new Set([
              'password',
              'passwordHash',
              'refreshToken',
              'refresh_token',
              'token',
              'accessToken',
              'access_token',
            ]);
            const keys = Object.keys(body).filter((k) => !skip.has(k));
            metadata.bodyKeys = keys.slice(0, 50);
          }
          void auditWriter.write({
            actorId: req.user!.id,
            actorCode: req.user!.userCode,
            actorRole: req.user!.role,
            actorIp: actorIp ?? undefined,
            actorAgent,
            action: `HTTP:${req.method}`,
            description: `${req.method} ${pathForLog} → ${res.statusCode}`,
            metadata,
          });
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

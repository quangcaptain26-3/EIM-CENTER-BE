import { Request, Response, NextFunction } from 'express';
import { LoginUseCase } from '../../../../application/auth/usecases/login.usecase';
import { RefreshUseCase } from '../../../../application/auth/usecases/refresh.usecase';
import { LogoutUseCase } from '../../../../application/auth/usecases/logout.usecase';
import { MeUseCase } from '../../../../application/auth/usecases/me.usecase';

export function createAuthController(
  loginUsecase: LoginUseCase,
  refreshUsecase: RefreshUseCase,
  logoutUsecase: LogoutUseCase,
  meUsecase: MeUseCase,
) {
  return {
    login: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        const result = await loginUsecase.execute(req.body, ip, userAgent);
        res.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    refresh: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        const result = await refreshUsecase.execute(req.body, ip, userAgent);
        res.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },

    logout: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        // Note: req.user should be available if we enforce authentication for logout
        // But often logout is just by refresh token. However, to audit log we need actor details.
        // We will assume logout route uses authenticate middleware.
        const actorId = req.user?.id || 'unknown';
        const actorRole = req.user?.role || 'unknown';

        await logoutUsecase.execute(req.body, actorId, actorRole, ip, userAgent);
        res.status(200).json({ data: { success: true } });
      } catch (error) {
        next(error);
      }
    },

    me: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await meUsecase.execute(req.user!.id);
        res.status(200).json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  };
}

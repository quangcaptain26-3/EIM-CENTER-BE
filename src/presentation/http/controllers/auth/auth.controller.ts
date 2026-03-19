import { Request, Response, NextFunction } from 'express';
import { LoginUseCase } from '../../../../application/auth/usecases/login.usecase';
import { RefreshUseCase } from '../../../../application/auth/usecases/refresh.usecase';
import { LogoutUseCase } from '../../../../application/auth/usecases/logout.usecase';
import { MeUseCase } from '../../../../application/auth/usecases/me.usecase';
import { buildContainer } from '../../../../bootstrap/container';
import { JwtProvider } from '../../../../infrastructure/auth/jwt.provider';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly meUseCase: MeUseCase
  ) {}

  /**
   * Đăng nhập vào hệ thống
   * Request (POST /auth/login):
   * { "email": "admin@eim.edu.vn", "password": "..." }
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": { 
   *       "accessToken": "...", 
   *       "refreshToken": "...", 
   *       "user": { "id": "...", "email": "...", "fullName": "...", "roles": [...], "permissions": [...] } 
   *   }
   * }
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.loginUseCase.execute(req.body);

      // Audit & Notification: AUTH_LOGIN
      // Không log password/token; chỉ log metadata trace tối thiểu.
      const container = buildContainer();
      const actorUserId = result.user?.id;
      if (actorUserId) {
        await container.system.auditWriter.write(actorUserId, "AUTH_LOGIN", "auth_user", actorUserId, {
          ip: req.ip,
          userAgent: req.headers["user-agent"] ?? null,
        });
        await container.system.notificationRepo.create({
          userId: actorUserId,
          title: "Đăng nhập thành công",
          body: "Tài khoản của bạn vừa đăng nhập vào hệ thống.",
        });
      }

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cấp lại Access Token mới dựa vào Refresh Token
   * Request (POST /auth/refresh):
   * { "refreshToken": "..." }
   * 
   * Response:
   * { "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }
   */
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.refreshUseCase.execute(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Đăng xuất hệ thống bằng cách thu hồi Refresh Token
   * Request (POST /auth/logout):
   * { "refreshToken": "..." }
   * 
   * Response:
   * { "success": true, "data": { "message": "Đăng xuất thành công" } }
   */
  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Vì req body có chứa refreshToken (đã qua validate)
      // Decode refresh token để trace actor (nếu token hợp lệ).
      let actorUserId: string | undefined = undefined;
      try {
        actorUserId = JwtProvider.verifyRefreshToken(req.body.refreshToken).userId;
      } catch {
        actorUserId = undefined;
      }

      await this.logoutUseCase.execute(req.body.refreshToken);

      // Audit & Notification: AUTH_LOGOUT (best-effort, không làm fail logout nếu không decode được)
      const container = buildContainer();
      if (actorUserId) {
        await container.system.auditWriter.write(actorUserId, "AUTH_LOGOUT", "auth_user", actorUserId, {
          ip: req.ip,
          userAgent: req.headers["user-agent"] ?? null,
        });
        await container.system.notificationRepo.create({
          userId: actorUserId,
          title: "Đăng xuất",
          body: "Bạn vừa đăng xuất khỏi hệ thống.",
        });
      }

      res.status(200).json({ success: true, data: { message: 'Đăng xuất thành công' } });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Kiểm tra thông tin User đang đăng nhập 
   * Headers:
   * { Authorization: "Bearer {accessToken}" }
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": { "id": "...", "email": "...", "fullName": "...", "status": "ACTIVE", "roles": [...], "permissions": [...] }
   * }
   */
  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
         // Trường hợp này AuthMiddleware đã chặn rồi, throw lỗi internal an toàn
        throw new Error('Không lấy được userId từ request headers');
      }

      const result = await this.meUseCase.execute(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}

import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from '../controllers/auth/auth.controller';
import { LoginUseCase } from '../../../application/auth/usecases/login.usecase';
import { RefreshUseCase } from '../../../application/auth/usecases/refresh.usecase';
import { LogoutUseCase } from '../../../application/auth/usecases/logout.usecase';
import { MeUseCase } from '../../../application/auth/usecases/me.usecase';
import { UserPgRepository } from '../../../infrastructure/db/repositories/auth/user.pg.repo';
import { validate } from '../middlewares/validate.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermissions } from '../middlewares/rbac.middleware';

// Mật khẩu và email schema
import { LoginSchema } from '../../../application/auth/dtos/login.dto';
import { RefreshSchema } from '../../../application/auth/dtos/refresh.dto';

const authRouter = Router();

// Khởi tạo các dependencies
const userRepo = new UserPgRepository();
const loginUseCase = new LoginUseCase(userRepo);
const refreshUseCase = new RefreshUseCase(userRepo);
const logoutUseCase = new LogoutUseCase(userRepo);
const meUseCase = new MeUseCase(userRepo);
const authController = new AuthController(loginUseCase, refreshUseCase, logoutUseCase, meUseCase);

// Đóng gói payload cho middleware schema parser với `body`
const validateLogin = validate(z.object({ body: LoginSchema }));
const validateRefresh = validate(z.object({ body: RefreshSchema }));

authRouter.post('/login', validateLogin, authController.login);
authRouter.post('/refresh', validateRefresh, authController.refresh);
authRouter.post('/logout', validateRefresh, authController.logout);

// Route /me yêu cầu phải Authorization Token và có permission AUTH_ME
authRouter.get('/me', authMiddleware, requirePermissions(['AUTH_ME']), authController.me);

export { authRouter };

import { Request, Response, NextFunction } from 'express';
import { JwtProvider } from '../../../infrastructure/auth/jwt.provider';
import { AppError } from '../../../shared/errors/app-error';

// Mở rộng kiểu dữ liệu Request của Express để chứa thông tin user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        roles: string[];
        permissions: string[];
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Thiếu token xác thực hoặc xác thực không đúng định dạng Bearer');
    }

    const token = authHeader.split(' ')[1];
    
    // Hàm verifyAccessToken sẽ throw exception nêú token ko hợp lệ hoặc hết hạn
    const payload = JwtProvider.verifyAccessToken(token);

    // Gắn thông tin Payload vào req.user để các controller hay middleware phía sau có thể tái sử dụng
    req.user = {
      userId: payload.userId,
      roles: payload.roles,
      permissions: payload.permissions
    };

    next();
  } catch (error) {
    next(error);
  }
};

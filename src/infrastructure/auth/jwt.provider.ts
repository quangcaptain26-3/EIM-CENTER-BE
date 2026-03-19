import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-key-dev';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-dev';
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '15m'; // AccessToken expiry ngắn
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d'; // Refresh dài

export interface JwtPayload {
  userId: string;
  roles: string[];
  permissions: string[];
}

export const JwtProvider = {
  /**
   * Tạo Access Token với thời hạn ngắn
   * Dùng để xác thực ở header Authorization: Bearer <token>
   */
  signAccessToken(payload: JwtPayload): string {
    return jwt.sign({ ...payload }, JWT_ACCESS_SECRET, { 
      expiresIn: JWT_ACCESS_EXPIRATION as any 
    });
  },

  /**
   * Tạo Refresh Token với thời hạn dài
   * Dùng để trao đổi lấy Access Token mới thay vì bắt user login lại
   */
  signRefreshToken(payload: JwtPayload): string {
    return jwt.sign({ ...payload }, JWT_REFRESH_SECRET, { 
      expiresIn: JWT_REFRESH_EXPIRATION as any 
    });
  },

  /**
   * Xác thực và giải mã Access Token
   * @throws Quăng lỗi nếu token hết hạn hoặc format không chính xác
   */
  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
  },

  /**
   * Xác thực và giải mã Refresh Token
   * @throws Quăng lỗi nếu token hết hạn hoặc format không chính xác
   */
  verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  }
};

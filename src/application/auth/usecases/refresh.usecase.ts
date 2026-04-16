import crypto from 'crypto';
import { ISessionRepo } from '../../../domain/auth/repositories/session.repo.port';
import { JwtProvider } from '../../../infrastructure/auth/jwt.provider';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { RefreshDto, RefreshDtoSchema } from '../dtos/auth.dto';
import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';

export class RefreshUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepo,
    private readonly userRepo: IUserRepo,
    private readonly jwtProvider: JwtProvider,
  ) {}

  async execute(input: RefreshDto, ip: string, userAgent: string) {
    const data = RefreshDtoSchema.parse(input);

    // 1. verifyRefresh token -> throw AUTH_TOKEN_INVALID
    const payload = this.jwtProvider.verifyRefresh(data.refreshToken);
    if (!payload) {
      throw new AppError(
        ERROR_CODES.AUTH_TOKEN_INVALID,
        'Invalid or expired refresh token',
        401,
      );
    }

    // Hash it to check in DB
    const tokenHash = crypto
      .createHash('sha256')
      .update(data.refreshToken)
      .digest('hex');

    // 2. Query user_sessions WHERE token_hash = sha256(token) AND revoked_at IS NULL AND expires_at > now()
    const session = await this.sessionRepo.findActiveSession(tokenHash);
    
    // 3. Nếu không tìm thấy → throw AUTH_TOKEN_EXPIRED
    if (!session || session.userId !== payload.userId) {
      throw new AppError(
        ERROR_CODES.AUTH_TOKEN_EXPIRED,
        'Session expired or revoked',
        401,
      );
    }

    // Retrieve user for role code
    const user = await this.userRepo.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new AppError(
        ERROR_CODES.AUTH_USER_INACTIVE,
        'User is inactive or deleted',
        401,
      );
    }

    // 4. Revoke session cũ
    await this.sessionRepo.revokeSession(tokenHash);

    // 5. Sign token mới, tạo session mới
    const newAccessToken = this.jwtProvider.signAccess({
      userId: user.id,
      role: user.role.code,
    });
    const newRefreshToken = this.jwtProvider.signRefresh({ userId: user.id });

    const newTokenHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');
    const decodedRefresh = this.jwtProvider.verifyRefresh(newRefreshToken);
    if (!decodedRefresh) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to issue refresh session',
        500,
      );
    }
    const expiresAt = new Date(decodedRefresh.exp * 1000);

    await this.sessionRepo.createSession({
      userId: user.id,
      tokenHash: newTokenHash,
      ipAddress: ip,
      userAgent: userAgent,
      expiresAt: expiresAt,
    });

    // 6. Trả result
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}

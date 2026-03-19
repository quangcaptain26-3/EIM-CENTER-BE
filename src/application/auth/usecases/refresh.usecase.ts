import crypto from 'crypto';
import { UserRepoPort } from '../../../domain/auth/repositories/user.repo.port';
import { JwtProvider, JwtPayload } from '../../../infrastructure/auth/jwt.provider';
import { RefreshDto } from '../dtos/refresh.dto';
import { AppError } from '../../../shared/errors/app-error';

export class RefreshUseCase {
  constructor(private readonly userRepo: UserRepoPort) {}

  async execute(dto: RefreshDto) {
    // 1. Giải mã token, kiểm tra tính hợp lệ JWT
    let payload: JwtPayload;
    try {
      payload = JwtProvider.verifyRefreshToken(dto.refreshToken);
    } catch (error) {
      throw AppError.unauthorized('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // 2. Băm token để đối chiếu với database
    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const tokenRecord = await this.userRepo.findValidRefreshToken(tokenHash);

    if (!tokenRecord) {
      throw AppError.unauthorized('Refresh token không tồn tại trong hệ thống');
    }

    if (tokenRecord.revokedAt) {
      throw AppError.unauthorized('Refresh token đã bị thu hồi');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token đã hết hạn trong hệ thống');
    }

    // 3. Rotate token (xóa token cũ vì đã đổi lấy cái mới)
    await this.userRepo.revokeRefreshToken(tokenHash);

    // 4. Lấy lại roles, permissions vì có thể có quyền bị cập nhật mới trong quá trình refresh
    const authInfo = await this.userRepo.getUserAuthInfo(payload.userId);
    if (!authInfo) {
      throw AppError.internal('Người dùng không tồn tại');
    }
    
    // 5. Khởi tạo lại Access, RefreshToken mới với session hạn dùng mới
    const newPayload = { userId: payload.userId, roles: authInfo.roles, permissions: authInfo.permissions };
    const newAccessToken = JwtProvider.signAccessToken(newPayload);
    const newRefreshToken = JwtProvider.signRefreshToken(newPayload);

    // 6. Lưu Refresh token mới
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.userRepo.createRefreshToken(payload.userId, newTokenHash, expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
}

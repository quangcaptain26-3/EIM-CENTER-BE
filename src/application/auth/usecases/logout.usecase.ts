import crypto from 'crypto';
import { UserRepoPort } from '../../../domain/auth/repositories/user.repo.port';
import { AppError } from '../../../shared/errors/app-error';

export class LogoutUseCase {
  constructor(private readonly userRepo: UserRepoPort) {}

  async execute(refreshToken: string) {
    if (!refreshToken) {
      throw AppError.badRequest('Thiếu Refresh token');
    }
    
    // Thu hồi refresh token trong CSDL
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.userRepo.revokeRefreshToken(tokenHash);
  }
}

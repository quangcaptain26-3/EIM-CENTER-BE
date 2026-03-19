import { UserRepoPort } from '../../../domain/auth/repositories/user.repo.port';
import { AuthMapper } from '../mappers/auth.mapper';
import { AppError } from '../../../shared/errors/app-error';

export class MeUseCase {
  constructor(private readonly userRepo: UserRepoPort) {}

  async execute(userId: string) {
    if (!userId) {
      throw AppError.unauthorized('Thiếu User ID hợp lệ');
    }

    const authInfo = await this.userRepo.getUserAuthInfo(userId);
    if (!authInfo) {
      throw AppError.notFound('Người dùng không tồn tại');
    }

    return AuthMapper.toProfile(authInfo.user, authInfo.roles, authInfo.permissions);
  }
}

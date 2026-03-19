import { UserRepoPort } from '../../../domain/auth/repositories/user.repo.port';
import { AuthMapper } from '../mappers/auth.mapper';
import { AppError } from '../../../shared/errors/app-error';

export class GetUserUseCase {
  constructor(private readonly userRepo: UserRepoPort) {}

  async execute(userId: string) {
    const authInfo = await this.userRepo.getUserAuthInfo(userId);
    
    if (!authInfo) {
      throw AppError.notFound(`Không tìm thấy người dùng có ID: ${userId}`);
    }

    return AuthMapper.toSystemUser(authInfo.user, authInfo.roles);
  }
}

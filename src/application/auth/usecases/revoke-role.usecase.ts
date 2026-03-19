import { UserRepoPort } from '../../../domain/auth/repositories/user.repo.port';
import { AppError } from '../../../shared/errors/app-error';

export class RevokeRoleUseCase {
  constructor(private readonly userRepo: UserRepoPort) {}

  async execute(userId: string, roleCode: string) {
    // 1. Kiểm tra User tồn tại và có Role hiện hành
    const userAuthInfo = await this.userRepo.getUserAuthInfo(userId);
    if (!userAuthInfo) {
      throw AppError.notFound(`Không tìm thấy người dùng có ID: ${userId}`);
    }

    // 2. Không cho phép thu hồi role cuối cùng (phải có ít nhất 1 role)
    if (userAuthInfo.roles.length <= 1 && userAuthInfo.roles.includes(roleCode)) {
      throw AppError.badRequest('Không thể thu hồi role cuối cùng của người dùng. Người dùng phải có ít nhất 1 role kết nối.');
    }

    // 3. Tiến hành thu hồi (revoke) role
    await this.userRepo.revokeRole(userId, roleCode);

    return { message: 'Thu hồi role thành công' };
  }
}

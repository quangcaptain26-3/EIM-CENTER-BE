import { UserRepoPort } from '../../../domain/auth/repositories/user.repo.port';
import { AuthMapper } from '../mappers/auth.mapper';
import { UpdateUserDto } from '../dtos/user-management.dto';
import { AppError } from '../../../shared/errors/app-error';

export class UpdateUserUseCase {
  constructor(private readonly userRepo: UserRepoPort) {}

  async execute(userId: string, data: UpdateUserDto) {
    // 1. Cập nhật thông tin User
    try {
      await this.userRepo.update(userId, {
        full_name: data.fullName,
        status: data.status,
      });
    } catch (error: any) {
      if (error.message === 'User not found') {
        throw AppError.notFound(`Không tìm thấy người dùng có ID: ${userId}`);
      }
      throw error;
    }

    // 2. Lấy lại thông tin sau khi cập nhật
    const authInfo = await this.userRepo.getUserAuthInfo(userId);
    if (!authInfo) {
      throw AppError.notFound(`Không tìm thấy người dùng có ID: ${userId} sau khi cập nhật`);
    }

    return AuthMapper.toSystemUser(authInfo.user, authInfo.roles);
  }
}

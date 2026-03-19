import { UserRepoPort } from '../../../domain/auth/repositories/user.repo.port';
import { AssignRoleDto } from '../dtos/user-management.dto';
import { AppError } from '../../../shared/errors/app-error';

export class AssignRoleUseCase {
  constructor(private readonly userRepo: UserRepoPort) {}

  async execute(userId: string, data: AssignRoleDto) {
    // 1. Kiểm tra User tồn tại
    const userAuthInfo = await this.userRepo.getUserAuthInfo(userId);
    if (!userAuthInfo) {
      throw AppError.notFound(`Không tìm thấy người dùng có ID: ${userId}`);
    }

    // 2. Kiểm tra User đã có Role này chưa
    if (userAuthInfo.roles.includes(data.roleCode)) {
      throw AppError.badRequest(`Người dùng này đã được gán Role ${data.roleCode} rồi`);
    }

    // 3. Tiến hành gán Role (Nếu role không tồn tại repo sẽ throw lỗi)
    try {
      await this.userRepo.assignRole(userId, data.roleCode);
    } catch (error: any) {
      if (error.message.includes('không tồn tại')) {
        throw AppError.badRequest(`Role ${data.roleCode} không tồn tại`);
      }
      throw error;
    }

    return { message: 'Gán ranh quyền thành công' };
  }
}

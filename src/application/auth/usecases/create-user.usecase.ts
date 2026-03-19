import { UserRepoPort } from '../../../domain/auth/repositories/user.repo.port';
import { AuthMapper } from '../mappers/auth.mapper';
import { CreateUserDto } from '../dtos/user-management.dto';
import { AppError } from '../../../shared/errors/app-error';
import { PasswordHasher } from '../../../infrastructure/auth/password-hasher';

export class CreateUserUseCase {
  constructor(private readonly userRepo: UserRepoPort) {}

  async execute(data: CreateUserDto) {
    // 1. Kiểm tra email đã được sử dụng chưa
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      throw AppError.badRequest('Email đã được sử dụng trong hệ thống');
    }

    // 2. Hash password
    const passwordHash = await PasswordHasher.hash(data.password);

    // 3. Tạo user mới
    const newUser = await this.userRepo.create({
      email: data.email,
      password_hash: passwordHash,
      full_name: data.fullName,
      status: 'ACTIVE',
    });

    // 4. Gán role ban đầu cho user
    try {
      await this.userRepo.assignRole(newUser.id, data.roleCode);
    } catch (error: any) {
      // Nếu role không tồn tại thì throw lỗi bad request
      throw AppError.badRequest(error.message);
    }

    // 5. Lấy lại thông tin user kèm role 
    const authInfo = await this.userRepo.getUserAuthInfo(newUser.id);
    if (!authInfo) {
      throw AppError.internal('Xảy ra lỗi khi truy xuất dữ liệu User sau khi tạo');
    }

    return AuthMapper.toSystemUser(authInfo.user, authInfo.roles);
  }
}

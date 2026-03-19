import crypto from 'crypto';
import { UserRepoPort } from '../../../domain/auth/repositories/user.repo.port';
import { PasswordHasher } from '../../../infrastructure/auth/password-hasher';
import { JwtProvider } from '../../../infrastructure/auth/jwt.provider';
import { LoginDto } from '../dtos/login.dto';
import { AppError } from '../../../shared/errors/app-error';
import { AuthMapper } from '../mappers/auth.mapper';

export class LoginUseCase {
  constructor(private readonly userRepo: UserRepoPort) {}

  async execute(dto: LoginDto) {
    // 1. Tìm user theo email
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw AppError.unauthorized('Email hoặc mật khẩu không chính xác');
    }

    // Kiểm tra trạng thái kích hoạt tài khoản
    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('Tài khoản đã bị khóa hoặc chưa kích hoạt');
    }

    // 2. Kiểm tra mật khẩu
    const isPasswordValid = await PasswordHasher.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Email hoặc mật khẩu không chính xác');
    }

    // 3. Lấy thông tin phân quyền của user
    const authInfo = await this.userRepo.getUserAuthInfo(user.id);
    if (!authInfo) {
      throw AppError.internal('Lỗi khi lấy thông tin phân quyền');
    }

    const { roles, permissions } = authInfo;

    // 4. Sinh mã Token
    const payload = { userId: user.id, roles, permissions };
    const accessToken = JwtProvider.signAccessToken(payload);
    const refreshToken = JwtProvider.signRefreshToken(payload);

    // 5. Lưu refresh token (đã hash sha256) vào Database để phòng ngừa lộ token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Mặc định refresh token tồn tại 7 ngày

    await this.userRepo.createRefreshToken(user.id, tokenHash, expiresAt);

    // 6. Trả về kết quả client
    return {
      accessToken,
      refreshToken,
      user: AuthMapper.toProfile(user, roles, permissions)
    };
  }
}

import crypto from 'crypto';
import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { ISessionRepo } from '../../../domain/auth/repositories/session.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { PasswordHasher } from '../../../infrastructure/auth/password-hasher';
import { JwtProvider } from '../../../infrastructure/auth/jwt.provider';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { LoginDtoSchema, LoginDto } from '../dtos/auth.dto';
import { toUserResponse } from '../mappers/auth.mapper';

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtProvider: JwtProvider,
  ) {}

  async execute(input: LoginDto, ip: string, userAgent: string) {
    const data = LoginDtoSchema.parse(input);

    // 1. findByEmail -> throw AUTH_INVALID_CREDENTIALS if not found or deleted
    const user = await this.userRepo.findByEmail(data.email);
    if (!user || user.isDeleted()) {
      throw new AppError(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Invalid email or password',
        401,
      );
    }

    // 2. Check is_active -> throw AUTH_USER_INACTIVE
    if (!user.isActive) {
      throw new AppError(
        ERROR_CODES.AUTH_USER_INACTIVE,
        'Account is suspended',
        401,
      );
    }

    // 3. compare password
    const isMatch = await this.passwordHasher.compare(
      data.password,
      user.passwordHash,
    );
    if (!isMatch) {
      throw new AppError(
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        'Invalid email or password',
        401,
      );
    }

    // 4. signAccess + signRefresh
    const accessToken = this.jwtProvider.signAccess({
      userId: user.id,
      role: user.role.code,
    });
    const refreshToken = this.jwtProvider.signRefresh({ userId: user.id });

    // 5. INSERT user_sessions
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    
    const decodedRefresh = this.jwtProvider.verifyRefresh(refreshToken);
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
      tokenHash,
      ipAddress: ip,
      userAgent,
      expiresAt,
    });

    // 6. Ghi audit log
    await this.auditLogRepo.log({
      action: 'AUTH:login',
      actorId: user.id,
      actorCode: user.userCode,
      actorRole: user.role.code,
      actorIp: ip,
      actorAgent: userAgent,
    });

    // 7. Return
    return {
      accessToken,
      refreshToken,
      user: toUserResponse(user),
    };
  }
}

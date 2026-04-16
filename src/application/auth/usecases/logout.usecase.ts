import crypto from 'crypto';
import { ISessionRepo } from '../../../domain/auth/repositories/session.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { RefreshDto, RefreshDtoSchema } from '../dtos/auth.dto';
import { JwtProvider } from '../../../infrastructure/auth/jwt.provider';

export class LogoutUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly jwtProvider: JwtProvider,
  ) {}

  async execute(
    input: RefreshDto,
    actorId: string,
    actorRole: string,
    ip: string,
    userAgent: string,
  ) {
    const data = RefreshDtoSchema.parse(input);

    const tokenHash = crypto
      .createHash('sha256')
      .update(data.refreshToken)
      .digest('hex');

    // Revoke session cũ (UPDATE revoked_at = now())
    await this.sessionRepo.revokeSession(tokenHash);

    // Ghi audit log: AUTH:logout
    await this.auditLogRepo.log({
      action: 'AUTH:logout',
      actorId,
      actorRole,
      actorIp: ip,
      actorAgent: userAgent,
    });
  }
}

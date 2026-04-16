import { ISessionCoverRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class CancelCoverUseCase {
  constructor(
    private readonly sessionCoverRepo: ISessionCoverRepo,
    private readonly auditRepo: any
  ) {}

  async execute(actorId: string, actorRole: string, sessionId: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'ACADEMIC') {
      throw new AppError(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION, 'Chỉ ADMIN hoặc Học vụ mới hủy được cover', 403);
    }

    const updated = await this.sessionCoverRepo.updateStatus(sessionId, 'cancelled');
    if (!updated) throw new AppError(ERROR_CODES.NOT_FOUND, 'Cover not found or already cancelled', 404);

    if (this.auditRepo) {
      await this.auditRepo.log('CLASS:cover_cancelled', { sessionId, cancelledBy: actorId });
    }

    return true;
  }
}

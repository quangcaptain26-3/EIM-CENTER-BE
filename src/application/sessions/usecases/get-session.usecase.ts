import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { AppError } from "../../../shared/errors/app-error";
import { Session } from "../../../domain/sessions/entities/session.entity";

export class GetSessionUseCase {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  /**
   * Lấy chi tiết một buổi học
   */
  async execute(sessionId: string): Promise<Session> {
    if (!sessionId) {
      throw AppError.badRequest("sessionId is required");
    }

    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw AppError.notFound("Session not found");
    }

    return session;
  }
}

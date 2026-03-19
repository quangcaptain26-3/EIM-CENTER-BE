import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { AppError } from "../../../shared/errors/app-error";
import { Session } from "../../../domain/sessions/entities/session.entity";

export class ListTeacherSessionsUseCase {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  /**
   * Lấy danh sách buổi học của một giáo viên
   */
  async execute(teacherId: string): Promise<Session[]> {
    if (!teacherId) {
      throw AppError.badRequest("teacherId is required");
    }
    
    return this.sessionRepo.listByTeacher(teacherId);
  }
}

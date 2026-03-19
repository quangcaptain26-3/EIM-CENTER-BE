import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { AppError } from "../../../shared/errors/app-error";
import { Session } from "../../../domain/sessions/entities/session.entity";

type Actor = { userId: string; roles: string[] };

export class ListClassSessionsUseCase {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  /**
   * Lấy danh sách buổi học của một lớp
   */
  async execute(classId: string, actor?: Actor): Promise<Session[]> {
    if (!classId) {
      throw AppError.badRequest("classId is required");
    }

    // Visibility theo teacher:
    // - TEACHER chỉ được xem sessions của lớp nếu họ là main/cover teacher của session đó.
    // - Các role khác giữ nguyên hành vi cũ (xem toàn bộ sessions theo class).
    if (actor?.roles?.includes("TEACHER")) {
      const owned = await this.sessionRepo.listByTeacher(actor.userId);
      return owned.filter((s) => s.classId === classId);
    }

    return this.sessionRepo.listByClass(classId);
  }
}

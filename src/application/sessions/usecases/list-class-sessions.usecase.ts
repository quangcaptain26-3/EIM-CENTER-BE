import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { ClassStaffRepoPort } from "../../../domain/classes/repositories/class-staff.repo.port";
import { AppError } from "../../../shared/errors/app-error";
import { Session } from "../../../domain/sessions/entities/session.entity";

type Actor = { userId: string; roles: string[] };

export class ListClassSessionsUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly classStaffRepo?: ClassStaffRepoPort,
  ) {}

  /**
   * Lấy danh sách buổi học của một lớp.
   * Teacher: xem TẤT CẢ sessions của lớp nếu class_staff HOẶC main/cover bất kỳ buổi nào.
   */
  async execute(classId: string, actor?: Actor): Promise<Session[]> {
    if (!classId) {
      throw AppError.badRequest("classId is required");
    }

    if (actor?.roles?.includes("TEACHER") && this.classStaffRepo) {
      // Teacher xem tất cả session lớp mình: class_staff hoặc main/cover bất kỳ buổi nào
      const isStaff = await this.classStaffRepo.isTeacherOfClass(actor.userId, classId);
      const owned = await this.sessionRepo.listByTeacher(actor.userId);
      const hasAnyInClass = owned.some((s) => s.classId === classId);
      if (isStaff || hasAnyInClass) {
        return this.sessionRepo.listByClass(classId);
      }
      return [];
    }

    return this.sessionRepo.listByClass(classId);
  }
}

import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { AppError } from "../../../shared/errors/app-error";
import { Session } from "../../../domain/sessions/entities/session.entity";
import { UpdateSessionBody } from "../dtos/update-session.dto";
import { canSetCoverTeacher } from "../../../domain/sessions/services/cover-teacher.rule";
import { UserRepoPort } from "../../../domain/auth/repositories/user.repo.port";

export class UpdateSessionUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly userRepo: UserRepoPort,
  ) {}

  /**
   * Cập nhật thông tin buổi học (Đổi lịch hoặc thay giáo viên)
   */
  async execute(sessionId: string, payload: UpdateSessionBody): Promise<Session> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw AppError.notFound("Session not found");
    }

    // Xử lý đổi lịch học
    if (payload.sessionDate) {
      const newDate = new Date(payload.sessionDate);
      
      // Nếu ngày mới trùng ngày cũ, bỏ qua
      if (newDate.getTime() !== session.sessionDate.getTime()) {
        try {
           return await this.sessionRepo.reschedule(sessionId, newDate, payload.note);
        } catch (error: any) {
           if (error.message === "CONFLICT_SESSION_DATE") {
              throw AppError.conflict("Đã có một buổi học khác trong ngày này");
           }
           throw error; // Rethrow các lỗi khác
        }
      }
    }

    // Xử lý đổi giáo viên dạy thay
    if (payload.coverTeacherId !== undefined) {
      // Bỏ giáo viên cover
      if (payload.coverTeacherId === null) {
        return this.sessionRepo.update(sessionId, { coverTeacherId: null });
      }

      const teacherAuth = await this.userRepo.getUserAuthInfo(payload.coverTeacherId);
      if (!teacherAuth || !teacherAuth.roles.includes("TEACHER")) {
        throw AppError.badRequest("coverTeacherId phải là user có role TEACHER", {
          code: "SESSION/COVER_TEACHER_ROLE_INVALID",
          coverTeacherId: payload.coverTeacherId,
        });
      }

      // Thêm/đổi giáo viên cover
      if (!canSetCoverTeacher(session.mainTeacherId, payload.coverTeacherId)) {
        throw AppError.badRequest("Giáo viên dạy thay không hợp lệ (không được trùng với giáo viên chính)");
      }

      return this.sessionRepo.update(sessionId, { coverTeacherId: payload.coverTeacherId });
    }

    if (payload.unitNo !== undefined || payload.lessonNo !== undefined) {
      return this.sessionRepo.update(sessionId, {
        unitNo: payload.unitNo,
        lessonNo: payload.lessonNo,
      });
    }

    return session;
  }
}

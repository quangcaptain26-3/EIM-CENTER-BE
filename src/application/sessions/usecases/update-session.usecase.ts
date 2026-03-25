import { ISessionRepository, UpdateSessionInput } from "../../../domain/sessions/repositories/session.repo.port";
import { AppError } from "../../../shared/errors/app-error";
import { Session } from "../../../domain/sessions/entities/session.entity";
import { UpdateSessionBody } from "../dtos/update-session.dto";
import { canSetCoverTeacher } from "../../../domain/sessions/services/cover-teacher.rule";
import { UserRepoPort } from "../../../domain/auth/repositories/user.repo.port";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { ProgramRepoPort } from "../../../domain/curriculum/repositories/program.repo.port";
import { UnitRepoPort } from "../../../domain/curriculum/repositories/unit.repo.port";
import { resolveSessionTypeFromCurriculum } from "../../../domain/curriculum/services/assessment-session.rule";

export class UpdateSessionUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly userRepo: UserRepoPort,
    private readonly classRepo: ClassRepoPort,
    private readonly programRepo: ProgramRepoPort,
    private readonly unitRepo: UnitRepoPort,
  ) {}

  /**
   * Cập nhật thông tin buổi học (Đổi lịch, hủy buổi, hoặc thay giáo viên)
   */
  async execute(sessionId: string, payload: UpdateSessionBody, actorUserId?: string): Promise<Session> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw AppError.notFound("Session not found");
    }

    // Cập nhật trạng thái (hủy buổi / mở lại)
    if (payload.sessionStatus !== undefined) {
      return this.sessionRepo.update(sessionId, { sessionStatus: payload.sessionStatus });
    }

    // Xử lý đổi lịch học
    if (payload.sessionDate) {
      if (session.sessionStatus === "CANCELLED") {
        throw AppError.badRequest("Không thể đổi lịch buổi học đã bị hủy. Cần mở lại (sessionStatus: SCHEDULED) trước.", {
          code: "SESSION/RESCHEDULE_CANCELLED",
          sessionId,
        });
      }
      const newDate = new Date(payload.sessionDate);

      // Nếu ngày mới trùng ngày cũ, bỏ qua
      if (newDate.getTime() !== session.sessionDate.getTime()) {
        try {
          return await this.sessionRepo.reschedule(sessionId, newDate, payload.note, actorUserId);
        } catch (error: any) {
          if (error.message === "CONFLICT_SESSION_DATE") {
            throw AppError.conflict("Đã có một buổi học khác trong ngày này");
          }
          throw error;
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
      const nextUnit = payload.unitNo ?? session.unitNo;
      const nextLesson = payload.lessonNo ?? session.lessonNo;

      const cls = await this.classRepo.findById(session.classId);
      if (!cls) {
        throw AppError.notFound("Class không tồn tại");
      }
      const program = await this.programRepo.findProgramById(cls.programId);
      if (!program) {
        throw AppError.badRequest("Không tìm thấy chương trình của lớp");
      }
      const totalUnits = Number(program.totalUnits);
      if (!Number.isFinite(totalUnits) || totalUnits <= 0) {
        throw AppError.badRequest("Program.totalUnits không hợp lệ");
      }

      const sessionType = resolveSessionTypeFromCurriculum(nextUnit, nextLesson, totalUnits);

      const patch: UpdateSessionInput = {
        unitNo: nextUnit,
        lessonNo: nextLesson,
        sessionType,
      };

      if (nextLesson === 0) {
        patch.lessonPattern = null;
      } else {
        const units = await this.unitRepo.listUnitsByProgram(cls.programId);
        const unit = units.find((u) => u.unitNo === nextUnit);
        if (unit) {
          await this.unitRepo.upsertDefaultLessons(unit.id);
          const lessons = await this.unitRepo.listLessons(unit.id);
          const match = lessons.find((l) => l.lessonNo === nextLesson);
          if (match) {
            patch.lessonPattern = match.sessionPattern;
          }
        }
      }

      return this.sessionRepo.update(sessionId, patch);
    }

    return session;
  }
}

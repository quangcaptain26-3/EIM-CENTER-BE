import { AppError } from "../../../shared/errors/app-error";
import { FeedbackRepoPort } from "../../../domain/feedback/repositories/feedback.repo.port";
import { teacherCanWriteSession } from "../../../domain/feedback/services/teacher-ownership.rule";
import { FeedbackPolicy } from "../../../domain/feedback/services/feedback.policy";
import { FeedbackValidator } from "../../../domain/feedback/services/feedback.validator";
import { RosterRepoPort } from "../../../domain/classes/repositories/roster.repo.port";
import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { UpsertFeedbackBody } from "../dtos/feedback.dto";
import { FeedbackMapper } from "../mappers/feedback.mapper";

type Actor = { userId: string; roles: string[] };

export class UpsertSessionFeedbackUseCase {
  constructor(
    private readonly feedbackRepo: FeedbackRepoPort,
    private readonly sessionRepo: ISessionRepository,
    private readonly rosterRepo: RosterRepoPort,
    private readonly classRepo: ClassRepoPort,
  ) {}

  async execute(sessionId: string, data: UpsertFeedbackBody, actor: Actor) {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw AppError.notFound("Không tìm thấy buổi học");
    }

    const klass = await this.classRepo.findById(session.classId);
    if (!klass) {
      throw AppError.notFound("Không tìm thấy lớp học của buổi học này");
    }
    if (klass.status !== "ACTIVE") {
      throw AppError.badRequest(`Không thể lưu nhận xét khi lớp đang ở trạng thái ${klass.status}`, {
        code: "CLASS/NOT_ACTIVE",
        classId: session.classId,
        status: klass.status,
      });
    }

    FeedbackPolicy.assertCanWriteSession({ ...session, id: sessionId }, actor);

    // Chống orphan feedback theo thời điểm: chỉ cho phép ghi cho học viên thuộc lớp tại ngày của session.
    const roster = await this.rosterRepo.listRosterAtDate(session.classId, session.sessionDate);
    const allowedStudentIds = new Set(roster.map((s) => s.studentId));

    const seenStudentIds = new Set<string>();
    for (const item of data.items) {
      if (seenStudentIds.has(item.studentId)) {
        throw AppError.badRequest('Danh sách feedback bị trùng studentId', {
          code: 'FEEDBACK_VALIDATION/DUPLICATE_STUDENT_IN_REQUEST',
          studentId: item.studentId,
        });
      }
      if (!allowedStudentIds.has(item.studentId)) {
        throw AppError.badRequest("Học viên không thuộc lớp của buổi học này", {
          code: "FEEDBACK_VALIDATION/NOT_IN_ROSTER",
          sessionId,
          studentId: item.studentId,
          classId: session.classId,
        });
      }
      seenStudentIds.add(item.studentId);
    }

    const itemsToUpsert = data.items.map(item => ({
      sessionId,
      studentId: item.studentId,
      teacherId: actor.userId,
      ...FeedbackValidator.normalizeValues({
        studentId: item.studentId,
        attendance: item.attendance,
        homework: item.homework,
        participation: item.participation,
        behavior: item.behavior,
        languageUsage: item.languageUsage,
        comment: item.comment,
      }),
    }));

    const upserted = await this.feedbackRepo.upsertMany(itemsToUpsert);
    return upserted.map(FeedbackMapper.toFeedbackResponse);
  }
}

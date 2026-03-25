import { AppError } from "../../../shared/errors/app-error";
import { ScoreRepoPort } from "../../../domain/feedback/repositories/score.repo.port";
import { FeedbackPolicy } from "../../../domain/feedback/services/feedback.policy";
import { canEditFeedbackByDeadline } from "../../../domain/feedback/services/feedback-edit-deadline.rule";
import { ScorePolicy } from "../../../domain/feedback/services/score.policy";
import { RosterRepoPort } from "../../../domain/classes/repositories/roster.repo.port";
import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { UpsertScoresBody } from "../dtos/score.dto";
import { FeedbackMapper } from "../mappers/feedback.mapper";

type Actor = { userId: string; roles: string[] };

export class UpsertSessionScoresUseCase {
  constructor(
    private readonly scoreRepo: ScoreRepoPort,
    private readonly sessionRepo: ISessionRepository,
    private readonly rosterRepo: RosterRepoPort,
    private readonly classRepo: ClassRepoPort,
  ) {}

  async execute(sessionId: string, data: UpsertScoresBody, actor: Actor) {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw AppError.notFound("Không tìm thấy buổi học");
    }
    if (session.sessionStatus === "CANCELLED") {
      throw AppError.badRequest("Không thể nhập điểm cho buổi học đã bị hủy", {
        code: "SCORE/SESSION_CANCELLED",
        sessionId,
      });
    }

    const klass = await this.classRepo.findById(session.classId);
    if (!klass) {
      throw AppError.notFound("Không tìm thấy lớp học của buổi học này");
    }
    if (klass.status !== "ACTIVE") {
      throw AppError.badRequest(`Không thể lưu điểm khi lớp đang ở trạng thái ${klass.status}`, {
        code: "CLASS/NOT_ACTIVE",
        classId: session.classId,
        status: klass.status,
      });
    }

    ScorePolicy.assertSessionTypeAllowsScore(session.sessionType);
    FeedbackPolicy.assertCanWriteSession({ ...session, id: sessionId }, actor);

    // R6: Teacher chỉ được sửa trong cửa sổ X ngày sau session; ACADEMIC/ROOT bỏ qua
    const deadlineCheck = canEditFeedbackByDeadline(session.sessionDate, actor.roles);
    if (!deadlineCheck.allowed) {
      throw AppError.badRequest(deadlineCheck.reason ?? "Đã quá hạn chỉnh sửa", {
        code: "FEEDBACK/EDIT_DEADLINE_PASSED",
        sessionId,
        sessionDate: session.sessionDate.toISOString(),
      });
    }

    // Chống orphan score theo thời điểm: chỉ cho phép nhập điểm cho học viên thuộc lớp tại ngày của session.
    const roster = await this.rosterRepo.listRosterAtDate(session.classId, session.sessionDate);
    const allowedStudentIds = new Set(roster.map((s) => s.studentId));

    const allowedScoreType = ScorePolicy.getAllowedScoreTypeForSession(session.sessionType);
    const seenStudentIds = new Set<string>();
    for (const item of data.items) {
      if (seenStudentIds.has(item.studentId)) {
        throw AppError.badRequest('Danh sách điểm bị trùng studentId', {
          code: 'SCORE_VALIDATION/DUPLICATE_STUDENT_IN_REQUEST',
          studentId: item.studentId,
        });
      }
      if (!allowedStudentIds.has(item.studentId)) {
        throw AppError.badRequest("Học viên không thuộc lớp của buổi học này", {
          code: "SCORE_VALIDATION/NOT_IN_ROSTER",
          sessionId,
          studentId: item.studentId,
          classId: session.classId,
        });
      }
      seenStudentIds.add(item.studentId);
      if (item.scoreType !== allowedScoreType) {
        throw AppError.badRequest('scoreType không phù hợp với sessionType', {
          code: 'SCORE_VALIDATION/SCORE_TYPE_NOT_ALLOWED_FOR_SESSION_TYPE',
          sessionType: session.sessionType,
          allowedScoreType,
          receivedScoreType: item.scoreType,
        });
      }
    }

    const itemsToUpsert = data.items.map((item) => {
      const normalized = ScorePolicy.normalizeScore({
        scoreType: item.scoreType,
        listening: item.listening ?? null,
        reading: item.reading ?? null,
        writing: item.writing ?? null,
        speaking: item.speaking ?? null,
        total: item.total ?? null,
        note: item.note ?? null,
      });

      return {
        sessionId,
        studentId: item.studentId,
        scoreType: normalized.scoreType,
        listening: normalized.listening,
        reading: normalized.reading,
        writing: normalized.writing,
        speaking: normalized.speaking,
        total: normalized.total,
        note: normalized.note,
      };
    });

    const upserted = await this.scoreRepo.upsertMany(itemsToUpsert);
    return {
      data: upserted.map(FeedbackMapper.toScoreResponse),
      sessionDate: session.sessionDate.toISOString(),
    };
  }
}

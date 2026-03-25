import { RosterRepoPort } from "../../../domain/classes/repositories/roster.repo.port";
import { FeedbackRepoPort } from "../../../domain/feedback/repositories/feedback.repo.port";
import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";

export class ListSessionFeedbackUseCase {
  constructor(
    private readonly feedbackRepo: FeedbackRepoPort,
    private readonly rosterRepo: RosterRepoPort,
    private readonly sessionRepo: ISessionRepository
  ) {}

  async execute(classId: string, sessionId: string) {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) return [];

    // 1. Roster tại thời điểm buổi học (tránh mất học viên đã chuyển lớp / khớp với upsert & export)
    const roster = await this.rosterRepo.listRosterAtDate(classId, session.sessionDate);
    
    // 2. Lấy feedback hiện tại của session
    const existingFeedbacks = await this.feedbackRepo.listBySession(sessionId);
    const feedbackMap = new Map(existingFeedbacks.map(f => [f.studentId, f]));

    // 3. Trộn dữ liệu: Mỗi học viên sẽ có feedback (nếu chưa có thì trả về null)
    return roster.map((enrollment: any) => {
      const fb = feedbackMap.get(enrollment.studentId);
      return {
        studentId: enrollment.studentId,
        studentName: enrollment.fullName,
        feedback: fb ? {
          id: fb.id,
          attendance: fb.attendance,
          homework: fb.homework,
          participation: fb.participation,
          behavior: fb.behavior,
          comment: fb.commentText,
          teacherId: fb.teacherId,
          updatedAt: fb.updatedAt.toISOString(),
        } : null
      };
    });
  }
}

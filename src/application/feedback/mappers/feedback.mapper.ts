import { SessionFeedback } from "../../../domain/feedback/entities/session-feedback.entity";
import { SessionScore } from "../../../domain/feedback/entities/session-score.entity";

export class FeedbackMapper {
  static toFeedbackResponse(item: SessionFeedback) {
    return {
      id: item.id,
      sessionId: item.sessionId,
      studentId: item.studentId,
      attendance: item.attendance,
      homework: item.homework,
      participation: item.participation,
      behavior: item.behavior,
      comment: item.commentText,
      teacherId: item.teacherId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  static toScoreResponse(item: SessionScore) {
    return {
      id: item.id,
      sessionId: item.sessionId,
      studentId: item.studentId,
      scoreType: item.scoreType,
      listening: item.listening,
      reading: item.reading,
      writing: item.writing,
      speaking: item.speaking,
      total: item.total,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

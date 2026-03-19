import { FeedbackRepoPort } from "../../../domain/feedback/repositories/feedback.repo.port";
import { FeedbackMapper } from "../mappers/feedback.mapper";

export class ListStudentFeedbackUseCase {
  constructor(private readonly feedbackRepo: FeedbackRepoPort) {}

  async execute(studentId: string, limit: number, offset: number) {
    const feedbacks = await this.feedbackRepo.listByStudent(studentId, limit, offset);
    return feedbacks.map(FeedbackMapper.toFeedbackResponse);
  }
}

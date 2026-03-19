import { ScoreRepoPort } from "../../../domain/feedback/repositories/score.repo.port";
import { FeedbackMapper } from "../mappers/feedback.mapper";

export class ListStudentScoresUseCase {
  constructor(private readonly scoreRepo: ScoreRepoPort) {}

  async execute(studentId: string, limit: number, offset: number) {
    const scores = await this.scoreRepo.listByStudent(studentId, limit, offset);
    return scores.map(FeedbackMapper.toScoreResponse);
  }
}

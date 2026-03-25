import { AppError } from "../../../shared/errors/app-error";
import { FeedbackRepoPort } from "../../../domain/feedback/repositories/feedback.repo.port";
import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { env } from "../../../config/env";

export type AttendanceSummaryResult = {
  enrollmentId: string;
  absentCount: number;
  totalSessions: number;
  warningThreshold: number;
  isAtRisk: boolean;
};

export class GetEnrollmentAttendanceSummaryUseCase {
  constructor(
    private readonly feedbackRepo: FeedbackRepoPort,
    private readonly enrollmentRepo: EnrollmentRepoPort
  ) {}

  async execute(enrollmentId: string): Promise<AttendanceSummaryResult> {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw AppError.notFound("Không tìm thấy ghi danh");
    }

    const threshold = env.ATTENDANCE_WARNING_THRESHOLD;
    const map = await this.feedbackRepo.getAttendanceSummaries([enrollmentId]);
    const summary = map.get(enrollmentId) ?? { absentCount: 0, totalSessions: 0 };

    return {
      enrollmentId,
      absentCount: summary.absentCount,
      totalSessions: summary.totalSessions,
      warningThreshold: threshold,
      isAtRisk: summary.absentCount >= threshold,
    };
  }
}

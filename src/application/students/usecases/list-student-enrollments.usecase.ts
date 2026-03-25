import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { StudentRepoPort } from "../../../domain/students/repositories/student.repo.port";
import { FeedbackRepoPort } from "../../../domain/feedback/repositories/feedback.repo.port";
import { StudentsMapper } from "../mappers/students.mapper";
import { AppError } from "../../../shared/errors/app-error";
import { env } from "../../../config/env";

export type ListStudentEnrollmentsOptions = {
  includeAttendanceSummary?: boolean;
};

export class ListStudentEnrollmentsUseCase {
  constructor(
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly studentRepo: StudentRepoPort,
    private readonly feedbackRepo?: FeedbackRepoPort
  ) {}

  async execute(studentId: string, options?: ListStudentEnrollmentsOptions) {
    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      throw AppError.notFound(`Không tìm thấy học viên với ID: ${studentId}`);
    }

    const enrollments = await this.enrollmentRepo.listByStudent(studentId);
    const base = enrollments.map(StudentsMapper.toEnrollmentResponse);

    if (options?.includeAttendanceSummary && this.feedbackRepo) {
      const ids = base.map((e) => e.id);
      const summaries = await this.feedbackRepo.getAttendanceSummaries(ids);
      const threshold = env.ATTENDANCE_WARNING_THRESHOLD;

      return base.map((e) => {
        const s = summaries.get(e.id);
        if (!s) return e;
        return {
          ...e,
          attendanceSummary: {
            absentCount: s.absentCount,
            totalSessions: s.totalSessions,
            warningThreshold: threshold,
            isAtRisk: s.absentCount >= threshold,
          },
        };
      });
    }

    return base;
  }
}

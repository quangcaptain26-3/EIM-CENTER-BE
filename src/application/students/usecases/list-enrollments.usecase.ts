import { IEnrollmentRepo, IPauseRequestRepo } from '../../../domain/students/repositories/student.repo.port';
import { enrollmentEntityToResponse } from '../mappers/enrollment.mapper';

export class ListEnrollmentsUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly pauseRequestRepo: IPauseRequestRepo,
  ) {}

  async execute(studentId: string) {
    const rows = await this.enrollmentRepo.findByStudentWithProgramClass(studentId);
    const out: Array<ReturnType<typeof enrollmentEntityToResponse> & { pendingPauseRequest: boolean }> = [];

    for (const row of rows) {
      const reqs = await this.pauseRequestRepo.findByEnrollment(row.enrollment.id);
      const pendingPauseRequest = reqs.some((r) => r.status === 'pending');
      out.push({
        ...enrollmentEntityToResponse(row.enrollment, {
          programCode: row.programCode,
          programName: row.programName,
          classCode: row.classCode,
        }),
        pendingPauseRequest,
      });
    }

    return out;
  }
}

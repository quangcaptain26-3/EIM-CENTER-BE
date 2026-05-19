import { IEnrollmentHistoryRepo } from '../../../domain/students/repositories/student.repo.port';
import { IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import {
  enrollmentHistoryActionLabel,
  type StudentEnrollmentHistoryRow,
} from '../mappers/enrollment-history.mapper';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class ListStudentEnrollmentHistoryUseCase {
  constructor(
    private readonly studentRepo: IStudentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
  ) {}

  async execute(studentId: string): Promise<StudentEnrollmentHistoryRow[]> {
    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      throw new AppError(ERROR_CODES.STUDENT_NOT_FOUND, 'Không tìm thấy học viên', 404);
    }

    const rows = await this.enrollmentHistoryRepo.findByStudentId(studentId);
    return rows.map((r) => ({
      id: r.id,
      enrollmentId: r.enrollmentId,
      action: r.action,
      actionLabel: enrollmentHistoryActionLabel(r.action),
      fromStatus: r.fromStatus ?? null,
      toStatus: r.toStatus ?? null,
      fromClassId: r.fromClassId ?? null,
      toClassId: r.toClassId ?? null,
      fromProgramId: r.fromProgramId ?? null,
      toProgramId: r.toProgramId ?? null,
      fromProgramCode: r.fromProgramCode ?? null,
      fromProgramName: r.fromProgramName ?? null,
      toProgramCode: r.toProgramCode ?? null,
      toProgramName: r.toProgramName ?? null,
      fromClassCode: r.fromClassCode ?? null,
      toClassCode: r.toClassCode ?? null,
      sessionsAtAction: r.sessionsAtAction ?? null,
      changedBy: r.changedBy ?? null,
      changedByName: r.changedByName ?? null,
      note: r.note ?? null,
      actionDate: r.actionDate ? r.actionDate.toISOString() : '',
      isPlacementAdjust: Boolean(r.note?.includes('placement_adjusted')),
    }));
  }
}

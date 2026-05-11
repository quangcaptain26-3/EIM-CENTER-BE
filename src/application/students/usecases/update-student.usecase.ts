import { Pool } from 'pg';
import { IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { refreshSearchViews } from '../../../infrastructure/db/refresh-views';
import { logger } from '../../../shared/logger';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class UpdateStudentUseCase {
  constructor(
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly db: Pool,
  ) {}

  async execute(
    id: string,
    data: Partial<{
      fullName: string;
      phone: string;
      parentPhone: string;
      address: string;
      dateOfBirth: string;
    }>,
    actor: { id: string; role: string; ip?: string },
  ) {
    const existing = await this.studentRepo.findById(id);
    if (!existing) {
      throw new AppError(ERROR_CODES.STUDENT_NOT_FOUND, 'Không tìm thấy học viên', 404);
    }

    const updated = await this.studentRepo.update(id, data as Record<string, unknown>);

    await this.auditLogRepo.log({
      action: 'STUDENT:updated',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'student',
      entityId: id,
      description: `Cập nhật thông tin học viên ${existing.studentCode}`,
    });

    void refreshSearchViews(this.db).catch((err) => logger.error(err));

    return updated;
  }
}

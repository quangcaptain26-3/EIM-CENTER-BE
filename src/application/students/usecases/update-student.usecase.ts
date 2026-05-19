import { Pool } from 'pg';
import { UpdateStudentDto, UpdateStudentSchema } from '../dtos/student.dto';
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
    dto: UpdateStudentDto,
    actor: { id: string; role: string; ip?: string },
  ) {
    const validData = UpdateStudentSchema.parse(dto);

    const existing = await this.studentRepo.findById(id);
    if (!existing) {
      throw new AppError(ERROR_CODES.STUDENT_NOT_FOUND, 'Không tìm thấy học viên', 404);
    }

    const patch: Record<string, unknown> = {};
    if (validData.fullName !== undefined) patch.fullName = validData.fullName;
    if (validData.dob !== undefined) patch.dob = validData.dob ? new Date(validData.dob) : null;
    if (validData.gender !== undefined) patch.gender = validData.gender;
    if (validData.address !== undefined) patch.address = validData.address;
    if (validData.schoolName !== undefined) patch.schoolName = validData.schoolName;
    if (validData.parentName !== undefined) patch.parentName = validData.parentName;
    if (validData.parentPhone !== undefined) patch.parentPhone = validData.parentPhone;
    if (validData.parentPhone2 !== undefined) patch.parentPhone2 = validData.parentPhone2;
    if (validData.parentZalo !== undefined) patch.parentZalo = validData.parentZalo;
    if (validData.testResult !== undefined) patch.testResult = validData.testResult;
    if (validData.currentLevel !== undefined) patch.currentLevel = validData.currentLevel;

    const updated = await this.studentRepo.update(id, patch);

    await this.auditLogRepo.log({
      action: 'STUDENT:updated',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'student',
      entityId: id,
      newValues: validData,
      description: `Cập nhật thông tin học viên ${existing.studentCode}`,
    });

    void refreshSearchViews(this.db).catch((err) => logger.error(err));

    return updated;
  }
}

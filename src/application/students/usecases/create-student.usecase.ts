import { Pool } from 'pg';
import { CreateStudentDto, CreateStudentSchema } from '../dtos/student.dto';
import { IStudentRepo } from '../../../domain/students/repositories/student.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { refreshSearchViews } from '../../../infrastructure/db/refresh-views';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { logger } from '../../../shared/logger';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class CreateStudentUseCase {
  constructor(
    private readonly studentRepo: IStudentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly db: Pool,
  ) {}

  async execute(
    dto: CreateStudentDto,
    actor: { id: string; role: string; ip?: string },
    options?: { skipSearchRefresh?: boolean },
  ) {
    // 1. Validate CreateStudentDto
    const validData = CreateStudentSchema.parse(dto);

    // 2. Sinh student_code: generateEimCode('HS'), check unique, retry tối đa 5 lần
    let studentCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      studentCode = generateEimCode('HS');
      const existing = await this.studentRepo.findByCode(studentCode);
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        'Không thể tạo mã học viên duy nhất, vui lòng thử lại',
        500,
      );
    }

    // 3. INSERT student
    const student = await this.studentRepo.create({
      studentCode,
      fullName: validData.fullName,
      dob: validData.dob ? new Date(validData.dob) : undefined,
      gender: validData.gender,
      address: validData.address,
      schoolName: validData.schoolName,
      parentName: validData.parentName,
      parentPhone: validData.parentPhone,
      parentPhone2: validData.parentPhone2,
      parentZalo: validData.parentZalo,
      testResult: validData.testResult,
      isActive: true,
      createdBy: actor.id
    });

    // 4. Ghi audit log
    await this.auditLogRepo.log({
      action: 'STUDENT:created',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'student',
      entityId: student.id,
      entityCode: student.studentCode,
      newValues: validData,
      description: `Tạo mới học viên ${student.fullName}`
    });

    if (!options?.skipSearchRefresh) {
      void refreshSearchViews(this.db).catch((err) => logger.error(err));
    }

    // 5. Trả StudentEntity
    return student;
  }
}

import { CreateEnrollmentDto, CreateEnrollmentSchema } from '../dtos/enrollment.dto';
import { IStudentRepo, IEnrollmentRepo, IEnrollmentHistoryRepo } from '../../../domain/students/repositories/student.repo.port';
import { IClassRepo, IProgramRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class CreateEnrollmentUseCase {
  constructor(
    private readonly studentRepo: IStudentRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly classRepo: IClassRepo,
    private readonly programRepo: IProgramRepo,
    private readonly auditLogRepo: IAuditLogRepo
  ) {}

  async execute(dto: CreateEnrollmentDto, actor: { id: string; role: string; ip?: string }) {
    if (!['ADMIN', 'ACADEMIC'].includes(actor.role)) {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Bạn không có quyền thực hiện chức năng này',
        403,
      );
    }

    const { studentId, classId, tuitionFee: tuitionFeeOverride } = CreateEnrollmentSchema.parse(dto);

    const student = await this.studentRepo.findById(studentId);
    if (!student) {
      throw new AppError(ERROR_CODES.STUDENT_NOT_FOUND, 'Không tìm thấy học viên', 404);
    }

    const cls = await this.classRepo.findById(classId);
    if (!cls) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp', 404);
    }
    if (!['pending', 'active'].includes(cls.status)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Lớp học không ở trạng thái nhận học viên',
        422,
      );
    }

    const program = await this.programRepo.findById(cls.programId);
    if (!program) {
      throw new AppError(ERROR_CODES.PROGRAM_NOT_FOUND, 'Không tìm thấy chương trình', 404);
    }

    const activeEnrollment = await this.enrollmentRepo.findActiveByStudent(studentId);
    if (activeEnrollment) {
      throw new AppError(
        ERROR_CODES.ENROLLMENT_ALREADY_ACTIVE,
        'Học viên đang có ghi danh đang hiệu lực',
        409,
      );
    }

    const classEnrollments = await this.enrollmentRepo.findByClass(classId);
    const activeInClassCount = classEnrollments.filter(e => ['trial', 'active'].includes(e.status)).length;
    if (activeInClassCount >= cls.maxCapacity) {
      throw new AppError(
        ERROR_CODES.CLASS_CAPACITY_EXCEEDED,
        'Lớp đã đủ sĩ số',
        409,
      );
    }

    const tuitionFee = tuitionFeeOverride ?? program.defaultFee;

    const enrollment = await this.enrollmentRepo.create({
      studentId,
      classId,
      programId: program.id,
      status: 'pending',
      tuitionFee,
      sessionsAttended: 0,
      sessionsAbsent: 0,
      classTransferCount: 0,
      makeupBlocked: false,
      createdBy: actor.id,
      enrolledAt: new Date()
    });

    await this.enrollmentHistoryRepo.create({
      enrollmentId: enrollment.id,
      action: 'enrolled',
      fromStatus: 'none',
      toStatus: 'pending',
      changedBy: actor.id,
    });

    await this.auditLogRepo.log({
      action: 'ENROLLMENT:created',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'enrollment',
      entityId: enrollment.id,
      description: `Ghi danh học viên ${student.fullName} vào lớp ${cls.classCode}`
    });

    return enrollment;
  }
}

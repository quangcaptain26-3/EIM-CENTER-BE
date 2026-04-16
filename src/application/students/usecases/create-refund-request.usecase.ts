import { IRefundRequestRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { IEnrollmentRepo, IEnrollmentHistoryRepo } from '../../../domain/students/repositories/student.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { CreateRefundRequestSchema } from '../dtos/refund.dto';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class CreateRefundRequestUseCase {
  constructor(
    private readonly refundRequestRepo: IRefundRequestRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly auditLogRepo: IAuditLogRepo
  ) {}

  async execute(dto: unknown, actor: { id: string; role: string; ip?: string }) {
    const input = CreateRefundRequestSchema.parse(dto);

    const enrollment = await this.enrollmentRepo.findById(input.enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    let finalAmount = 0;
    let finalStatus: 'pending' | 'completed' = 'pending';

    if (input.reasonType === 'center_unable_to_open') {
      finalAmount = enrollment.tuitionFee;
      finalStatus = 'pending';
    } else if (input.reasonType.startsWith('subjective_')) {
      finalAmount = 0;
      finalStatus = 'completed';
    } else if (input.reasonType === 'special_case') {
      if (input.refundAmount === undefined || input.refundAmount < 0) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'special_case phải cung cấp refundAmount hợp lệ',
          422,
        );
      }
      finalAmount = input.refundAmount;
      finalStatus = 'pending';
    } else {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'reasonType không hợp lệ', 422);
    }

    const requestCode = generateEimCode('HP');

    const request = await this.refundRequestRepo.create({
      requestCode,
      enrollmentId: enrollment.id,
      reasonType: input.reasonType,
      reasonDetail: input.reasonDetail,
      refundAmount: finalAmount,
      status: finalStatus
    });

    if (finalStatus === 'completed') {
      const fromStatus = enrollment.status;
      await this.enrollmentRepo.updateStatus(enrollment.id, 'dropped');

      await this.enrollmentHistoryRepo.create({
        enrollmentId: enrollment.id,
        action: 'dropped',
        fromStatus,
        toStatus: 'dropped',
        note: `Subjective drop without refund: ${input.reasonDetail}`,
        changedBy: actor.id,
      });
    }

    await this.auditLogRepo.log({
      action: 'ATTENDANCE:refund_created',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'enrollment',
      entityId: enrollment.id,
      description: `Tạo yêu cầu hoàn phí ${requestCode} (${input.reasonType}) cho enrollment ${enrollment.id}`,
    });

    return request;
  }
}

import { IEnrollmentRepo, IEnrollmentHistoryRepo, IPauseRequestRepo } from '../../../domain/students/repositories/student.repo.port';
import { ReviewPauseRequestSchema } from '../dtos/enrollment.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class ReviewPauseRequestUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly enrollmentHistoryRepo: IEnrollmentHistoryRepo,
    private readonly pauseRequestRepo: IPauseRequestRepo
  ) {}

  async execute(dto: unknown, actor: { id: string; role: string }) {
    if (actor.role !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ có quản trị viên mới có quyền duyệt yêu cầu tạm dừng',
        403,
      );
    }

    const { requestId, status, reviewNote } = ReviewPauseRequestSchema.parse(dto);

    const request = await this.pauseRequestRepo.findById(requestId);
    if (!request) {
      throw new AppError(ERROR_CODES.PAUSE_REQUEST_NOT_FOUND, 'Không tìm thấy yêu cầu bảo lưu', 404);
    }
    if (request.status !== 'pending') {
      throw new AppError(ERROR_CODES.PAUSE_REQUEST_ALREADY_REVIEWED, 'Yêu cầu đã được xử lý trước đó', 409);
    }

    if (status === 'rejected' && !reviewNote) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cần nhập lý do từ chối (reviewNote)', 422);
    }

    if (status === 'approved') {
      await this.pauseRequestRepo.updateStatus(requestId, 'approved', {
        reviewedBy: actor.id,
        reviewNote
      });

      const enrollment = await this.enrollmentRepo.findById(request.enrollmentId);
      if (enrollment) {
        const previousStatus = enrollment.status;
        await this.enrollmentRepo.updateStatus(request.enrollmentId, 'paused');

        await this.enrollmentHistoryRepo.create({
          enrollmentId: request.enrollmentId,
          action: 'paused',
          fromStatus: previousStatus,
          toStatus: 'paused',
          note: `Approved pause: ${reviewNote || 'No note'}`,
          changedBy: actor.id,
        });
      }
    } else {
      await this.pauseRequestRepo.updateStatus(requestId, 'rejected', {
        reviewedBy: actor.id,
        reviewNote
      });
    }

    return { success: true };
  }
}

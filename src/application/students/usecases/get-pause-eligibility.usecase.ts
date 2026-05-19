/**
 * GET /enrollments/:id/pause-eligibility — FE gọi trước modal bảo lưu (EIM_EXTENDED_FEATURES).
 */
import { IEnrollmentRepo, IPauseRequestRepo } from '../../../domain/students/repositories/student.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

const MAX_PAUSE_COUNT = 1;

export type PauseEligibilityResult = {
  canPause: boolean;
  reason?: string;
  pauseType: 'immediate' | 'requires_approval' | 'not_allowed';
  pauseCount: number;
  maxPauseCount: number;
  isFreePeriod: boolean;
  sessionsAttended: number;
  hasPendingRequest: boolean;
};

export class GetPauseEligibilityUseCase {
  constructor(
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly pauseRequestRepo: IPauseRequestRepo,
  ) {}

  async execute(enrollmentId: string): Promise<{ data: PauseEligibilityResult }> {
    const enrollment = await this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    const sessionsAttended = enrollment.sessionsAttended ?? 0;
    const pauseCount = enrollment.pauseCount ?? 0;
    const isFreePeriod = sessionsAttended < 3;

    const requests = await this.pauseRequestRepo.findByEnrollment(enrollmentId);
    const hasPendingRequest = requests.some((r) => r.status === 'pending');

    if (enrollment.status !== 'active') {
      return {
        data: {
          canPause: false,
          reason: 'Chỉ học viên đang học (active) mới được bảo lưu',
          pauseType: 'not_allowed',
          pauseCount,
          maxPauseCount: MAX_PAUSE_COUNT,
          isFreePeriod,
          sessionsAttended,
          hasPendingRequest,
        },
      };
    }

    if (pauseCount >= MAX_PAUSE_COUNT) {
      return {
        data: {
          canPause: false,
          reason: 'Mỗi ghi danh chỉ được bảo lưu tối đa 1 lần',
          pauseType: 'not_allowed',
          pauseCount,
          maxPauseCount: MAX_PAUSE_COUNT,
          isFreePeriod,
          sessionsAttended,
          hasPendingRequest,
        },
      };
    }

    if (hasPendingRequest) {
      return {
        data: {
          canPause: false,
          reason: 'Đã có yêu cầu bảo lưu đang chờ duyệt',
          pauseType: 'not_allowed',
          pauseCount,
          maxPauseCount: MAX_PAUSE_COUNT,
          isFreePeriod,
          sessionsAttended,
          hasPendingRequest: true,
        },
      };
    }

    const pauseType: PauseEligibilityResult['pauseType'] = isFreePeriod
      ? 'immediate'
      : 'requires_approval';

    return {
      data: {
        canPause: true,
        pauseType,
        pauseCount,
        maxPauseCount: MAX_PAUSE_COUNT,
        isFreePeriod,
        sessionsAttended,
        hasPendingRequest: false,
      },
    };
  }
}

import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { ConflictCheckerService } from '../../../domain/classes/services/conflict-checker.service';
import { toUserResponse } from '../../auth/mappers/auth.mapper';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export type AvailableCoverTeacherRow = ReturnType<typeof toUserResponse> & {
  isAvailable: boolean;
  conflictReason: string | null;
};

export class FindAvailableCoversUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepo,
    private readonly userRepo: IUserRepo,
    private readonly conflictChecker: ConflictCheckerService,
  ) {}

  async execute(sessionId: string): Promise<AvailableCoverTeacherRow[]> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Không tìm thấy buổi học', 404);
    }

    const sess = session as {
      teacherId?: string;
      teacher_id?: string;
      shift?: number;
      classId?: string;
      class_id?: string;
      sessionDate?: Date;
      session_date?: Date;
    };
    const mainTeacherId = sess.teacherId ?? sess.teacher_id;
    const classId = sess.classId ?? sess.class_id;
    const sessionShift = Number(sess.shift);
    const rawDate = sess.sessionDate ?? sess.session_date;
    const sessionDate = rawDate instanceof Date ? rawDate : new Date(String(rawDate));

    if (!mainTeacherId || !classId || (sessionShift !== 1 && sessionShift !== 2)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Buổi học thiếu thông tin lớp/ca', 422);
    }

    const dayOfWeekVn = sessionDate.getDay() === 0 ? 8 : sessionDate.getDay() + 1;

    const { data: teachers } = await this.userRepo.findAll({
      roleCode: 'TEACHER',
      isActive: true,
      page: 1,
      limit: 10_000,
    });

    const out: AvailableCoverTeacherRow[] = [];

    for (const user of teachers) {
      if (user.id === mainTeacherId) continue;

      const { hasConflict, conflictReason } = await this.conflictChecker.checkTeacherConflictWithDetail({
        teacherId: user.id,
        scheduleDays: [dayOfWeekVn],
        shift: sessionShift,
        excludeClassId: classId,
      });

      out.push({
        ...toUserResponse(user),
        isAvailable: !hasConflict,
        conflictReason,
      });
    }

    return out;
  }
}

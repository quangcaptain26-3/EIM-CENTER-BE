import { ISessionRepo, ISessionCoverRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { ConflictCheckerService } from '../../../domain/classes/services/conflict-checker.service';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class AssignCoverUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepo,
    private readonly sessionCoverRepo: ISessionCoverRepo,
    private readonly userRepo: any,
    private readonly auditRepo: any,
    private readonly conflictChecker: ConflictCheckerService,
  ) {}

  async execute(actorId: string, actorRole: string, sessionId: string, coverTeacherId: string, reason: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'ACADEMIC') {
      throw new AppError(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION, 'Chỉ ADMIN hoặc Học vụ mới gán được cover', 403);
    }

    const session = await this.sessionRepo.findById(sessionId);
    if (!session) throw new AppError(ERROR_CODES.NOT_FOUND, 'Session not found', 404);

    const mainTeacherId = (session as { teacherId?: string; teacher_id?: string }).teacherId ?? (session as { teacher_id?: string }).teacher_id;
    if (!mainTeacherId) throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Session missing teacher', 400);

    // Check if session is pending and future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rawDate = (session as { sessionDate?: Date; session_date?: Date }).sessionDate ?? (session as { session_date?: Date }).session_date;
    const sessionDate = rawDate instanceof Date ? rawDate : new Date(String(rawDate));

    if (session.status !== 'pending' || sessionDate.getTime() < today.getTime()) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Can only assign cover for pending future sessions',
        400,
      );
    }

    const existingCover = await this.sessionCoverRepo.findBySession(sessionId);
    if (existingCover) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Session already has an active cover', 400);
    }

    const coverTeacher = await this.userRepo.findById(coverTeacherId);
    if (!coverTeacher || coverTeacher.role?.code !== 'TEACHER' || !coverTeacher.isActive) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cover teacher is invalid or inactive', 400);
    }

    if (coverTeacher.id === mainTeacherId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Cover teacher cannot be the main teacher of the session', 400);
    }

    const dayOfWeekvn = sessionDate.getDay() === 0 ? 8 : sessionDate.getDay() + 1;
    const sess = session as { shift?: number; classId?: string; class_id?: string };
    const sessionShift = Number(sess.shift);
    if (sessionShift !== 1 && sessionShift !== 2) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Session shift invalid', 400);
    }

    const classId = sess.classId ?? sess.class_id;
    if (!classId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Session missing class', 400);
    }

    const coverHasScheduleConflict = await this.conflictChecker.checkTeacherConflict({
      teacherId: coverTeacherId,
      scheduleDays: [dayOfWeekvn],
      shift: sessionShift,
      excludeClassId: classId,
    });
    if (coverHasScheduleConflict) {
      throw new AppError(
        ERROR_CODES.CLASS_TEACHER_CONFLICT,
        'GV cover có lịch trùng ca/ngày với lớp khác',
        409,
      );
    }

    const availableTeachers = await this.sessionCoverRepo.findAvailableTeachers(sessionId);
    const row = availableTeachers.find((t: { userId?: string }) => t.userId === coverTeacherId);
    if (!row || !row.isAvailable) {
      throw new AppError(
        ERROR_CODES.CLASS_TEACHER_CONFLICT,
        'GV này vừa có lịch trùng, vui lòng chọn lại',
        409,
      );
    }

    const cover = await this.sessionCoverRepo.create({
      sessionId,
      coverTeacherId,
      reason,
      status: 'pending',
      assignedBy: actorId,
    });

    if (this.auditRepo) {
      await this.auditRepo.log('CLASS:cover_assigned', { sessionId, coverTeacherId, assignedBy: actorId });
    }

    return cover;
  }
}

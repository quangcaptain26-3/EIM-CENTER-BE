import { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { ConflictCheckerService } from '../../../domain/classes/services/conflict-checker.service';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { HolidayPgRepo } from '../../../infrastructure/db/repositories/classes/holiday.pg.repo';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class RescheduleSessionUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepo,
    private readonly classRepo: IClassRepo,
    private readonly conflictChecker: ConflictCheckerService,
    private readonly holidayRepo: HolidayPgRepo,
    private readonly auditRepo: any
  ) {}

  async execute(userId: string, actorRole: string, sessionId: string, newDateStr: string, reason: string) {
    if (actorRole !== 'ADMIN' && actorRole !== 'ACADEMIC') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN hoặc ACADEMIC mới được dời lịch buổi học',
        403,
      );
    }

    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new AppError(ERROR_CODES.SESSION_NOT_FOUND, 'Không tìm thấy buổi học', 404);
    }
    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Không thể dời lịch buổi đã hoàn thành hoặc đã hủy',
        422,
      );
    }

    const newDate = new Date(newDateStr);

    const holidays = await this.holidayRepo.findAll();
    const isHoliday = holidays.some((h: any) => {
        if (h.isRecurring) {
          return h.date.getMonth() === newDate.getMonth() && h.date.getDate() === newDate.getDate();
        }
        return h.date.getFullYear() === newDate.getFullYear() && 
               h.date.getMonth() === newDate.getMonth() && 
               h.date.getDate() === newDate.getDate();
    });
    if (isHoliday) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Ngày mới trùng ngày lễ', 422);
    }

    const s = session as typeof session & { class_id?: string; teacher_id?: string };
    const classId = s.classId ?? s.class_id;
    const teacherId = s.teacherId ?? s.teacher_id;
    if (!classId || !teacherId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Buổi học thiếu thông tin lớp hoặc giáo viên', 422);
    }

    const tClass = await this.classRepo.findById(classId);
    if (!tClass) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp', 404);
    }

    const dayOfWeekvn = newDate.getDay() === 0 ? 8 : newDate.getDay() + 1;

    const isTeacherConflict = await this.conflictChecker.checkTeacherConflict({
      teacherId,
      scheduleDays: [dayOfWeekvn],
      shift: session.shift,
      excludeClassId: classId,
    });
    if (isTeacherConflict) {
      throw new AppError(ERROR_CODES.CLASS_TEACHER_CONFLICT, 'Trùng lịch giáo viên', 409);
    }

    const isRoomConflict = await this.conflictChecker.checkRoomConflict({
      roomId: tClass.roomId,
      scheduleDays: [dayOfWeekvn],
      shift: session.shift,
      excludeClassId: classId,
    });
    if (isRoomConflict) {
      throw new AppError(ERROR_CODES.CLASS_ROOM_CONFLICT, 'Trùng lịch phòng', 409);
    }

    const updateData: any = {
      sessionDate: newDate,
      rescheduleReason: reason,
      rescheduledBy: userId
    };

    if (!session.originalDate) {
      updateData.originalDate = session.sessionDate;
    }

    const updatedSession = await this.sessionRepo.update(sessionId, updateData);

    if (this.auditRepo) {
      await this.auditRepo.log('CLASS:session_rescheduled', { sessionId, oldDate: session.sessionDate, newDate, updatedBy: userId });
    }

    return updatedSession;
  }
}

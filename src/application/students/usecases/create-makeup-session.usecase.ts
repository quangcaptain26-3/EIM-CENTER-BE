import { IMakeupSessionRepo, IAttendanceRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { IEnrollmentRepo } from '../../../domain/students/repositories/student.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { ConflictCheckerService } from '../../../domain/classes/services/conflict-checker.service';
import { CreateMakeupSessionSchema } from '../dtos/attendance.dto';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

function toDateOnlyString(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return '';
  return x.toISOString().slice(0, 10);
}

export class CreateMakeupSessionUseCase {
  constructor(
    private readonly makeupSessionRepo: IMakeupSessionRepo,
    private readonly attendanceRepo: IAttendanceRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly conflictChecker: ConflictCheckerService,
  ) {}

  async execute(dto: unknown, actor: { id: string; role: string; ip?: string }) {
    if (!['ADMIN', 'ACADEMIC'].includes(actor.role)) {
      throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Không có quyền thực hiện', 403);
    }

    const data = CreateMakeupSessionSchema.parse(dto);

    const attendance = await this.attendanceRepo.findById(data.attendanceId);
    if (!attendance) {
      throw new AppError(ERROR_CODES.ATTENDANCE_NOT_FOUND, 'Không tìm thấy bản ghi điểm danh', 404);
    }

    if (attendance.status !== 'absent_excused') {
      throw new AppError(
        ERROR_CODES.ATTENDANCE_UNEXCUSED_NO_MAKEUP,
        'Chỉ được học bù nếu vắng có phép',
        422,
      );
    }

    const enrollment = await this.enrollmentRepo.findById(attendance.enrollmentId);
    if (!enrollment) {
      throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
    }

    if (enrollment.makeupBlocked) {
      throw new AppError(
        ERROR_CODES.ATTENDANCE_MAKEUP_BLOCKED,
        'Học viên đã bị khóa quyền học bù',
        403,
      );
    }

    const existing = await this.makeupSessionRepo.findByAttendance(data.attendanceId);
    if (existing) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Đã có lịch học bù cho buổi vắng này',
        409,
      );
    }

    if (enrollment.sessionsAttended >= 24) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Học viên đã hoàn thành chương trình, không thể học bù',
        422,
      );
    }

    const makeupDate = new Date(data.makeupDate);
    if (Number.isNaN(makeupDate.getTime())) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Ngày học bù không hợp lệ', 400);
    }

    const lastSession = await this.sessionRepo.findLastSessionOfEnrollment(enrollment.id);
    if (lastSession) {
      const makeupDay = toDateOnlyString(makeupDate);
      const lastDay = toDateOnlyString(lastSession.sessionDate);
      if (makeupDay >= lastDay) {
        throw new AppError(
          ERROR_CODES.MAKEUP_DATE_TOO_LATE,
          'Ngày học bù phải trước buổi học cuối của khóa',
          400,
        );
      }
    }

    const roomConflict = await this.conflictChecker.checkRoomConflictByDate({
      roomId: data.roomId,
      date: makeupDate,
      shift: data.shift,
    });
    if (roomConflict) {
      throw new AppError(
        ERROR_CODES.CLASS_ROOM_CONFLICT,
        'Phòng học đã có lịch vào ngày và ca này',
        409,
      );
    }

    const teacherConflict = await this.conflictChecker.checkTeacherConflictByDate({
      teacherId: data.teacherId,
      date: makeupDate,
      shift: data.shift,
    });
    if (teacherConflict) {
      throw new AppError(
        ERROR_CODES.CLASS_TEACHER_CONFLICT,
        'Giáo viên đã có lịch vào ngày và ca này',
        409,
      );
    }

    let makeupCode = '';
    let attempts = 0;
    while (attempts < 5) {
      makeupCode = generateEimCode('BB');
      attempts++;
      break;
    }

    const makeupSession = await this.makeupSessionRepo.create({
      makeupCode,
      attendanceId: attendance.id,
      enrollmentId: enrollment.id,
      makeupDate,
      shift: data.shift,
      roomId: data.roomId,
      teacherId: data.teacherId,
      status: 'pending'
    });

    await this.auditLogRepo.log({
      action: 'ATTENDANCE:makeup_created',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'makeup_session',
      entityId: makeupSession.id,
      description: `Tạo lịch học bù ${makeupCode} cho enrollment ${enrollment.id}`
    });

    return makeupSession;
  }
}

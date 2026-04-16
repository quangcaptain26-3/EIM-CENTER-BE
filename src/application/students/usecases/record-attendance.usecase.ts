import { IAttendanceRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { SessionEntity } from '../../../domain/sessions/entities/session.entity';
import { ISessionRepo, ISessionCoverRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { IEnrollmentRepo } from '../../../domain/students/repositories/student.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { RecordAttendanceSchema } from '../dtos/attendance.dto';
import { isSessionDateTodayHoChiMin } from '../../../shared/utils/vn-date';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

function sessionMainTeacherId(session: { teacherId?: string; teacher_id?: string }): string | undefined {
  return session.teacherId ?? session.teacher_id;
}

function coverTeacherId(cover: { coverTeacherId?: string; cover_teacher_id?: string } | null): string | undefined {
  if (!cover) return undefined;
  return cover.coverTeacherId ?? cover.cover_teacher_id;
}

export class RecordAttendanceUseCase {
  constructor(
    private readonly attendanceRepo: IAttendanceRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly sessionCoverRepo: ISessionCoverRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(dto: any, actor: { id: string; role: string; ip?: string }) {
    const { sessionId, records } = RecordAttendanceSchema.parse(dto);

    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new AppError(ERROR_CODES.SESSION_NOT_FOUND, 'Không tìm thấy buổi học', 404);
    }

    const sess = session as unknown as Record<string, unknown>;
    const sessionDate = sess.sessionDate ?? sess.session_date;
    if (!isSessionDateTodayHoChiMin(sessionDate as Date | string)) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Chỉ điểm danh được trong ngày học', 422);
    }

    if (session.status === 'cancelled') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Không thể điểm danh cho buổi học đã bị huỷ',
        422,
      );
    }

    if (session.status !== 'pending') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Buổi học không còn ở trạng thái chờ điểm danh',
        422,
      );
    }

    const mainId = sessionMainTeacherId(session as { teacherId?: string; teacher_id?: string });
    const cover = await this.sessionCoverRepo.findBySession(sessionId);
    const coverId = coverTeacherId(cover as { coverTeacherId?: string; cover_teacher_id?: string } | null);

    if (actor.role === 'TEACHER') {
      const isMain = mainId != null && actor.id === mainId;
      const isCover = coverId != null && actor.id === coverId;
      if (!isMain && !isCover) {
        throw new AppError(
          ERROR_CODES.ACCESS_DENIED,
          'Chỉ giáo viên phụ trách buổi này (chính hoặc cover) mới điểm danh được',
          403,
        );
      }
    } else if (!['ADMIN', 'ACADEMIC'].includes(actor.role)) {
      throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Không có quyền điểm danh', 403);
    }

    for (const record of records) {
      await this.attendanceRepo.upsert({
        sessionId,
        studentId: record.studentId,
        enrollmentId: record.enrollmentId,
        status: record.status,
        note: record.note,
        recordedBy: actor.id,
      });
    }

    const classId = (session as SessionEntity & { class_id?: string }).classId ?? (session as { class_id?: string }).class_id;
    if (!classId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Buổi học thiếu thông tin lớp', 422);
    }
    const classEnrollments = await this.enrollmentRepo.findByClass(classId);
    const activeEnrollments = classEnrollments.filter((e) => ['active', 'trial'].includes(e.status));

    const currentAttendances = await this.attendanceRepo.findBySession(sessionId);

    if (currentAttendances.length >= activeEnrollments.length && activeEnrollments.length > 0) {
      await this.sessionRepo.update(sessionId, { status: 'completed' });
    }

    await this.auditLogRepo.log({
      action: 'ATTENDANCE:recorded',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'session',
      entityId: sessionId,
      description: `Điểm danh buổi ${(session as { sessionNo?: number }).sessionNo ?? (session as { session_no?: number }).session_no ?? ''}`,
    });

    return { success: true, recordedCount: records.length };
  }
}

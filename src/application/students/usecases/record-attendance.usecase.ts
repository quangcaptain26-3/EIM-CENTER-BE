import { IAttendanceRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { RecordAttendanceSchema } from '../dtos/attendance.dto';
import { isSessionDateTodayHoChiMin } from '../../../shared/utils/vn-date';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

type AttendanceLike = {
  studentId?: string;
  student_id?: string;
  enrollmentId?: string;
  enrollment_id?: string;
  status?: string;
  note?: string | null;
};

function ymdVnNow(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function toYmd(dateLike: unknown): string {
  if (dateLike instanceof Date) return dateLike.toISOString().slice(0, 10);
  if (typeof dateLike === 'string') return dateLike.slice(0, 10);
  return '';
}

function buildAttendanceMap(rows: AttendanceLike[]): Map<string, { status: string; note: string | null }> {
  const map = new Map<string, { status: string; note: string | null }>();
  for (const r of rows) {
    const enrollmentId = String(r.enrollmentId ?? r.enrollment_id ?? '');
    if (!enrollmentId) continue;
    map.set(enrollmentId, {
      status: String(r.status ?? ''),
      note: r.note ?? null,
    });
  }
  return map;
}

export class RecordAttendanceUseCase {
  constructor(
    private readonly attendanceRepo: IAttendanceRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly classRepo: IClassRepo,
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
    const isTodaySession = isSessionDateTodayHoChiMin(sessionDate as Date | string);

    if (session.status === 'cancelled') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Không thể điểm danh cho buổi học đã bị huỷ',
        422,
      );
    }

    if (!['pending', 'completed'].includes(session.status)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Buổi học không ở trạng thái cho phép điểm danh',
        422,
      );
    }

    if (actor.role === 'TEACHER') {
      const effectiveTeacherId = await this.sessionRepo.findEffectiveTeacherId(sessionId);
      if (effectiveTeacherId !== actor.id) {
        throw new AppError(
          ERROR_CODES.ACCESS_DENIED,
          'Chỉ giáo viên phụ trách buổi này mới điểm danh được',
          403,
        );
      }
    } else if (!['ADMIN', 'ACADEMIC'].includes(actor.role)) {
      throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Không có quyền điểm danh', 403);
    }

    // Rule: sửa điểm danh sau ngày chỉ Admin được làm.
    if (!isTodaySession && actor.role !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.ACCESS_DENIED,
        'Chỉ Admin được sửa điểm danh sau ngày học',
        403,
      );
    }

    const prevRows = await this.attendanceRepo.findBySession(sessionId);
    const prevMap = buildAttendanceMap(prevRows as unknown as AttendanceLike[]);

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

    const classId = (session as { classId?: string; class_id?: string }).classId ?? (session as { class_id?: string }).class_id;
    if (!classId) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Buổi học thiếu thông tin lớp', 422);
    }
    const classInfo = await this.classRepo.findById(classId);
    const classCode = classInfo?.classCode ?? classId;
    const sessionNo = (session as { sessionNo?: number; session_no?: number }).sessionNo
      ?? (session as { session_no?: number }).session_no
      ?? 0;

    const currentAttendances = await this.attendanceRepo.findBySession(sessionId);
    await this.sessionRepo.update(sessionId, { status: 'completed' });

    const snapshot = (currentAttendances as unknown as AttendanceLike[]).map((r) => ({
      enrollmentId: String(r.enrollmentId ?? r.enrollment_id ?? ''),
      studentId: String(r.studentId ?? r.student_id ?? ''),
      status: String(r.status ?? ''),
      note: r.note ?? null,
    }));
    const diff = snapshot
      .map((row) => {
        const prev = prevMap.get(row.enrollmentId);
        if (!prev) return { enrollmentId: row.enrollmentId, old: null, new: row };
        if (prev.status === row.status && (prev.note ?? null) === (row.note ?? null)) return null;
        return {
          enrollmentId: row.enrollmentId,
          old: { status: prev.status, note: prev.note },
          new: { status: row.status, note: row.note },
        };
      })
      .filter(Boolean);

    const presentOrLate = snapshot.filter((r) => r.status === 'present' || r.status === 'late').length;
    const absent = snapshot.filter((r) => r.status === 'absent_excused' || r.status === 'absent_unexcused').length;

    await this.auditLogRepo.log({
      action: 'ATTENDANCE:recorded',
      actorId: actor.id,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'session',
      entityId: sessionId,
      entityCode: `${classCode}#${sessionNo}`,
      oldValues: { snapshot: (prevRows as unknown as AttendanceLike[]).map((r) => ({
        enrollmentId: String(r.enrollmentId ?? r.enrollment_id ?? ''),
        studentId: String(r.studentId ?? r.student_id ?? ''),
        status: String(r.status ?? ''),
        note: r.note ?? null,
      })) },
      newValues: { snapshot },
      diff,
      description: `Điểm danh buổi ${sessionNo} lớp ${classCode}: ${presentOrLate} có mặt, ${absent} vắng (${toYmd(sessionDate) || ymdVnNow()})`,
    });

    return { success: true, recordedCount: records.length };
  }
}

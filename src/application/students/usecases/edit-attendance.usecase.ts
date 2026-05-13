import { IAttendanceRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { EditAttendanceSchema } from '../dtos/attendance.dto';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class EditAttendanceUseCase {
  constructor(
    private readonly attendanceRepo: IAttendanceRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly classRepo: IClassRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(
    dto: unknown,
    actor: { id: string; role: string; ip?: string; userCode?: string },
  ) {
    if (actor.role === 'TEACHER') {
      throw new AppError(ERROR_CODES.ATTENDANCE_FORBIDDEN, 'Giáo viên không được sửa điểm danh', 403);
    }
    if (!['ACADEMIC', 'ADMIN'].includes(actor.role)) {
      throw new AppError(ERROR_CODES.ACCESS_DENIED, 'Không có quyền sửa điểm danh', 403);
    }

    const { sessionId, records, editReason } = EditAttendanceSchema.parse(dto);
    if (!editReason.trim()) {
      throw new AppError(
        ERROR_CODES.ATTENDANCE_EDIT_REASON_REQUIRED,
        'Thiếu lý do chỉnh sửa điểm danh',
        422,
      );
    }

    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new AppError(ERROR_CODES.SESSION_NOT_FOUND, 'Không tìm thấy buổi học', 404);
    }
    if (session.status !== 'completed') {
      throw new AppError(
        ERROR_CODES.ATTENDANCE_NOT_SUBMITTED,
        'Buổi học chưa được điểm danh lần đầu',
        422,
      );
    }

    const beforeRows = await this.attendanceRepo.findDetailRowsBySession(sessionId);
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
    await this.sessionRepo.update(sessionId, {
      lastEditedBy: actor.id,
      lastEditedAt: new Date(),
    });
    const afterRows = await this.attendanceRepo.findDetailRowsBySession(sessionId);

    const beforeMap = new Map(beforeRows.map((row) => [row.enrollmentId, row]));
    const diff = afterRows
      .map((row) => {
        const before = beforeMap.get(row.enrollmentId);
        if (!before) {
          return {
            studentCode: row.studentCode,
            before: null,
            after: row.status,
            note: row.note,
          };
        }
        const changed = before.status !== row.status || (before.note ?? null) !== (row.note ?? null);
        if (!changed) return null;
        return {
          studentCode: row.studentCode,
          before: before.status,
          after: row.status,
          note: row.note,
        };
      })
      .filter(Boolean);

    const classInfo = await this.classRepo.findById(session.classId);
    const classCode = classInfo?.classCode ?? session.classId;
    const sessionNo = session.sessionNo ?? 0;

    await this.auditLogRepo.log({
      action: 'ATTENDANCE:edited',
      actorId: actor.id,
      actorCode: actor.userCode,
      actorRole: actor.role,
      actorIp: actor.ip,
      entityType: 'session',
      entityId: sessionId,
      entityCode: `${classCode}#${sessionNo}`,
      description: `Sửa điểm danh buổi ${sessionNo} lớp ${classCode}`,
      metadata: {
        editReason,
        editedBy: { userCode: actor.userCode ?? actor.id, role: actor.role },
        diff,
      },
      oldValues: { snapshot: beforeRows },
      newValues: { snapshot: afterRows },
      diff,
    });

    return { success: true, editedCount: diff.length };
  }
}

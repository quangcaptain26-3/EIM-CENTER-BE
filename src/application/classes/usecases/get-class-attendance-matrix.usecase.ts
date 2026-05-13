import type { Pool } from 'pg';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IAttendanceRepo } from '../../../domain/students/repositories/attendance.repo.port';
import { IEnrollmentRepo } from '../../../domain/students/repositories/student.repo.port';
import { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { ensureClassAttendanceScope } from '../guards/ensure-class-access-by-role';

/**
 * Ma trận điểm danh (học viên × buổi) — Q41, OVERVIEW §7.3, §12.2 export pivot.
 *
 * Cách vận hành:
 * - `ensureClassAttendanceScope`: giới hạn role được xem ma trận lớp.
 * - Join roster (trial+active) + thứ tự sessions + ô attendance (P/L/A/U) — cùng nguồn logic với export attendance-sheet trong `ExportDataUseCase`.
 */
export class GetClassAttendanceMatrixUseCase {
  constructor(
    private readonly classRepo: IClassRepo,
    private readonly enrollmentRepo: IEnrollmentRepo,
    private readonly sessionRepo: ISessionRepo,
    private readonly attendanceRepo: IAttendanceRepo,
    private readonly db: Pick<Pool, 'query'>,
  ) {}

  async execute(classId: string, actor: { id: string; role: string }) {
    await ensureClassAttendanceScope(this.db, actor, classId);
    const cls = await this.classRepo.findById(classId);
    if (!cls) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp', 404);
    }

    const [roster, sessions, cells] = await Promise.all([
      this.enrollmentRepo.findRosterByClass(classId),
      this.sessionRepo.findByClass(classId),
      this.attendanceRepo.findCellsByClassId(classId),
    ]);

    const sessionRows = sessions.map((s) => {
      const r = s as unknown as Record<string, unknown>;
      const no = Number(r.sessionNo ?? r.session_no ?? 0);
      const d = r.sessionDate ?? r.session_date;
      const sessionDate =
        d instanceof Date ? d.toISOString().slice(0, 10) : String(d ?? '').slice(0, 10);
      return {
        id: String(r.id),
        sessionNo: no,
        sessionDate,
        status: String(r.status ?? 'pending'),
        shift: Number(r.shift ?? 1),
        submittedAt: r.submittedAt ?? r.submitted_at ?? null,
        submittedBy: r.submittedBy ?? r.submitted_by ?? null,
        lastEditedAt: r.lastEditedAt ?? r.last_edited_at ?? null,
        lastEditedBy: r.lastEditedBy ?? r.last_edited_by ?? null,
      };
    });

    const submittedByIds = Array.from(
      new Set(
        sessionRows
          .map((s) => s.submittedBy)
          .filter((x): x is string => Boolean(x)),
      ),
    );
    const editedByIds = Array.from(
      new Set(
        sessionRows
          .map((s) => s.lastEditedBy)
          .filter((x): x is string => Boolean(x)),
      ),
    );
    const userIds = Array.from(new Set([...submittedByIds, ...editedByIds]));
    const userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const userRows = await this.db.query(
        `SELECT id, full_name FROM users WHERE id = ANY($1::uuid[])`,
        [userIds],
      );
      for (const row of userRows.rows as Array<{ id: string; full_name: string }>) {
        userMap.set(row.id, row.full_name);
      }
    }
    const normalizedSessionRows = sessionRows.map((s) => ({
      ...s,
      submittedByName:
        typeof s.submittedBy === 'string' ? userMap.get(s.submittedBy) ?? null : null,
      lastEditedByName:
        typeof s.lastEditedBy === 'string' ? userMap.get(s.lastEditedBy) ?? null : null,
    }));

    const studentRows = roster.map((r) => ({
      enrollmentId: r.enrollmentId,
      studentId: r.studentId,
      studentCode: r.studentCode,
      studentName: r.studentName,
      status: r.status,
    }));

    return {
      data: {
        classId,
        classCode: cls.classCode,
        students: studentRows,
        sessions: normalizedSessionRows,
        cells,
      },
    };
  }
}

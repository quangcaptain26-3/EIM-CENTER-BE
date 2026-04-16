import { Pool } from 'pg';
import { IClassRepo, IClassStaffRepo } from '../../../domain/classes/repositories/class.repo.port';
import { ConflictCheckerService } from '../../../domain/classes/services/conflict-checker.service';
import { ISessionRepo } from '../../../domain/sessions/repositories/session.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class ReplaceTeacherUseCase {
  constructor(
    private readonly classRepo: IClassRepo,
    private readonly classStaffRepo: IClassStaffRepo,
    private readonly userRepo: any,
    private readonly sessionRepo: ISessionRepo,
    private readonly conflictChecker: ConflictCheckerService,
    private readonly auditRepo: any,
    private readonly db: Pool,
  ) {}

  async execute(userId: string, actorRole: string, classId: string, newTeacherId: string) {
    if (actorRole !== 'ADMIN') {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN mới thay giáo viên chính lớp đang diễn ra',
        403,
      );
    }

    const newTeacher = await this.userRepo.findById(newTeacherId);
    if (!newTeacher || newTeacher.role.code !== 'TEACHER' || !newTeacher.isActive) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Người dùng không phải giáo viên hoạt động', 422);
    }

    const targetClass = await this.classRepo.findById(classId);
    if (!targetClass) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp', 404);
    }
    if (targetClass.status !== 'active') {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp phải đang active để thay giáo viên', 422);
    }

    const isConflict = await this.conflictChecker.checkTeacherConflict({
      teacherId: newTeacherId,
      scheduleDays: targetClass.scheduleDays,
      shift: targetClass.shift,
      excludeClassId: classId,
    });
    if (isConflict) {
      throw new AppError(ERROR_CODES.CLASS_TEACHER_CONFLICT, 'Trùng lịch giáo viên', 409);
    }

    const activeStaffs = await this.classStaffRepo.findActiveByClass(classId);
    const oldTeacherId = activeStaffs[0]?.teacher_id ?? activeStaffs[0]?.teacherId;

    let fromSessionNo = 1;
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const minPending = await this.sessionRepo.getFirstPendingSessionNo(classId, client);
      fromSessionNo = minPending ?? 1;

      await client.query(
        `UPDATE class_staff SET effective_to_session = $1 WHERE class_id = $2 AND effective_to_session IS NULL`,
        [fromSessionNo - 1, classId],
      );

      await client.query(
        `INSERT INTO class_staff (class_id, teacher_id, effective_from_session, assigned_by, assigned_at)
         VALUES ($1, $2, $3, $4, now())`,
        [classId, newTeacherId, fromSessionNo, userId],
      );

      await this.sessionRepo.updateTeacherFromSession(classId, fromSessionNo, newTeacherId, client);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    if (this.auditRepo) {
      await this.auditRepo.log('CLASS:teacher_replaced', {
        classId,
        oldTeacherId,
        newTeacherId,
        sessionNo: fromSessionNo,
        updatedBy: userId,
      });
    }

    return await this.classRepo.findById(classId);
  }
}

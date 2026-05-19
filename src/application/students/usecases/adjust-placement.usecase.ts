/**
 * Điều chỉnh cấp độ + lớp sau test / học thử (trial | pending).
 * Drop enrollment cũ + tạo enrollment mới program khác; ghi enrollment_history + audit.
 */
import { Pool } from 'pg';
import { AdjustPlacementSchema } from '../dtos/enrollment.dto';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { resolveClassRefToId } from '../../classes/utils/resolve-class-ref';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

type Actor = { id: string; role: string; ip?: string };

export class AdjustPlacementUseCase {
  constructor(
    private readonly db: Pool,
    private readonly classRepo: IClassRepo,
    private readonly auditLogRepo: IAuditLogRepo,
  ) {}

  async execute(dto: unknown, actor: Actor) {
    if (!['ADMIN', 'ACADEMIC'].includes(actor.role)) {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Bạn không có quyền thực hiện chức năng này',
        403,
      );
    }

    const { enrollmentId, newClassId: newClassRef, note } = AdjustPlacementSchema.parse(dto);
    const newClassId = await resolveClassRefToId(this.classRepo, newClassRef);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const curRes = await client.query(`SELECT * FROM enrollments WHERE id = $1 FOR UPDATE`, [enrollmentId]);
      const current = curRes.rows[0] as Record<string, unknown> | undefined;
      if (!current) {
        throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Không tìm thấy ghi danh', 404);
      }

      const status = String(current.status);
      if (!['trial', 'pending'].includes(status)) {
        throw new AppError(
          ERROR_CODES.ENROLLMENT_PLACEMENT_LOCKED,
          'Chỉ điều chỉnh được khi ghi danh đang học thử hoặc chờ học',
          422,
        );
      }

      const sessionsAttended = Number(current.sessions_attended ?? 0);
      if (sessionsAttended >= 3) {
        throw new AppError(
          ERROR_CODES.ENROLLMENT_PLACEMENT_LOCKED,
          'Đã học quá 3 buổi, không thể điều chỉnh cấp/lớp',
          409,
        );
      }

      if (status === 'active' || current.paid_at != null) {
        throw new AppError(
          ERROR_CODES.ENROLLMENT_PLACEMENT_LOCKED,
          'Học viên đã học chính thức, không thể điều chỉnh cấp/lớp',
          422,
        );
      }

      const tuitionFee = Number(current.tuition_fee);
      const paidRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS paid FROM receipts WHERE enrollment_id = $1`,
        [enrollmentId],
      );
      const paidAmount = Number(paidRes.rows[0]?.paid ?? 0);
      if (paidAmount >= tuitionFee) {
        throw new AppError(
          ERROR_CODES.ENROLLMENT_PLACEMENT_LOCKED,
          'Đã đóng đủ học phí, không thể điều chỉnh cấp/lớp',
          409,
        );
      }

      const oldProgramId = String(current.program_id);
      const oldClassId = String(current.class_id);
      const studentId = String(current.student_id);

      if (oldClassId === newClassId) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp mới phải khác lớp hiện tại', 422);
      }

      const ncRes = await client.query(
        `SELECT c.id, c.status, c.program_id, c.max_capacity,
                p.code AS program_code, p.default_fee
         FROM classes c
         JOIN programs p ON p.id = c.program_id
         WHERE c.id = $1`,
        [newClassId],
      );
      const newClass = ncRes.rows[0] as
        | {
            id: string;
            status: string;
            program_id: string;
            max_capacity: number;
            program_code: string;
            default_fee: number;
          }
        | undefined;
      if (!newClass) {
        throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp mới', 404);
      }

      if (newClass.program_id === oldProgramId) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Phải chọn lớp thuộc chương trình (cấp độ) khác. Nếu chỉ đổi lớp cùng cấp, dùng Chuyển lớp.',
          422,
        );
      }

      if (!['pending', 'active'].includes(newClass.status)) {
        throw new AppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Lớp mới không ở trạng thái nhận học viên',
          422,
        );
      }

      const capRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM enrollments
         WHERE class_id = $1 AND status IN ('trial', 'active')`,
        [newClassId],
      );
      const activeInNew = Number(capRes.rows[0]?.c ?? 0);
      if (activeInNew >= Number(newClass.max_capacity)) {
        throw new AppError(ERROR_CODES.CLASS_CAPACITY_EXCEEDED, 'Lớp mới đã đủ sĩ số', 409);
      }

      const opRes = await client.query(`SELECT code FROM programs WHERE id = $1`, [oldProgramId]);
      const oldProgramCode = String(opRes.rows[0]?.code ?? '');

      const historyNote = `placement_adjusted: ${oldProgramCode} → ${newClass.program_code}${note ? `. ${note}` : ''}`;

      await client.query(`UPDATE students SET current_level = $1, updated_at = NOW() WHERE id = $2`, [
        newClass.program_code,
        studentId,
      ]);

      await client.query(
        `UPDATE enrollments SET status = 'dropped', updated_at = NOW() WHERE id = $1`,
        [enrollmentId],
      );

      await client.query(
        `INSERT INTO enrollment_history (
          enrollment_id, action, from_status, to_status, from_class_id, to_class_id,
          from_program_id, to_program_id, sessions_at_action, changed_by, note
        ) VALUES ($1, 'dropped', $2, 'dropped', $3, $4, $5, $6, $7, $8, $9)`,
        [
          enrollmentId,
          status,
          oldClassId,
          newClassId,
          oldProgramId,
          newClass.program_id,
          sessionsAttended,
          actor.id,
          historyNote,
        ],
      );

      await client.query(
        `INSERT INTO enrollment_history (
          enrollment_id, action, from_status, to_status, from_program_id, to_program_id,
          sessions_at_action, changed_by, note
        ) VALUES ($1, 'program_changed', $2, 'dropped', $3, $4, $5, $6, $7)`,
        [
          enrollmentId,
          status,
          oldProgramId,
          newClass.program_id,
          sessionsAttended,
          actor.id,
          historyNote,
        ],
      );

      const newEnrRes = await client.query(
        `INSERT INTO enrollments (
          student_id, program_id, class_id, status, tuition_fee,
          sessions_attended, sessions_absent, class_transfer_count, pause_count,
          makeup_blocked, reservation_fee, enrolled_at, created_by
        ) VALUES ($1,$2,$3,$4,$5,0,0,0,0,false,0,NOW(),$6)
        RETURNING id`,
        [
          studentId,
          newClass.program_id,
          newClassId,
          status,
          Number(newClass.default_fee),
          actor.id,
        ],
      );
      const newEnrollmentId = String(newEnrRes.rows[0].id);

      await client.query(
        `INSERT INTO enrollment_history (
          enrollment_id, action, from_status, to_status, sessions_at_action, changed_by, note
        ) VALUES ($1, 'enrolled', 'none', $2, 0, $3, $4)`,
        [newEnrollmentId, status, actor.id, 'placement_adjusted_in'],
      );

      await client.query(
        `INSERT INTO enrollment_history (
          enrollment_id, action, from_status, to_status, from_class_id, to_class_id,
          from_program_id, to_program_id, sessions_at_action, changed_by, note
        ) VALUES ($1, 'program_changed', $2, $2, $3, $4, $5, $6, 0, $7, $8)`,
        [
          newEnrollmentId,
          status,
          oldClassId,
          newClassId,
          oldProgramId,
          newClass.program_id,
          actor.id,
          historyNote,
        ],
      );

      const stuRes = await client.query(`SELECT student_code FROM students WHERE id = $1`, [studentId]);
      const studentCode = String(stuRes.rows[0]?.student_code ?? studentId);

      await this.auditLogRepo.log({
        action: 'ENROLLMENT:placement_adjusted',
        actorId: actor.id,
        actorRole: actor.role,
        actorIp: actor.ip,
        entityType: 'enrollment',
        entityId: newEnrollmentId,
        entityCode: studentCode,
        description: `Điều chỉnh cấp/lớp ${oldProgramCode} → ${newClass.program_code} (từ ${enrollmentId} sang ${newEnrollmentId})`,
      });

      await client.query('COMMIT');

      const fresh = await this.db.query(`SELECT * FROM enrollments WHERE id = $1`, [newEnrollmentId]);
      return fresh.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

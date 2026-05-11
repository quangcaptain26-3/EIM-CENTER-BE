/**
 * Nâng chương trình giữa khóa (ADMIN only) — Q17, OVERVIEW §8.6.
 *
 * Cách vận hành (transaction):
 * - Enrollment cũ phải `active`. Tính credit phần chưa học (làm tròn xuống từng đồng — `Math.floor`):
 *     credit = floor(tuition_fee × (24 - sessions_attended) / 24)
 *   (tương đương học phí còn lại của các buổi chưa dùng.)
 * - `additional_fee = newProgram.default_fee - credit` (có thể âm → phiếu “hoàn chênh lệch”; dương → thu thêm).
 * - Phiếu âm gắn enrollment cũ; DROP enrollment cũ; tạo enrollment mới `tuition_fee = default_fee` chương mới;
 *   nếu `additional_fee !== 0` thì tạo phiếu thu cho enrollment mới.
 * - Ghi `program_upgrade_requests`, `enrollment_history`, cập nhật `students.current_level` = mã program mới.
 */
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { amountToWordsVi } from '../../../shared/utils/amount-to-words';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

type Actor = { id: string; role: string; ip?: string };

type UpgradeProgramBody = {
  enrollmentId: string;
  newProgramId: string;
  newClassId: string;
  note?: string;
};

export class UpgradeProgramUseCase {
  constructor(private readonly db: Pool) {}

  async execute(body: UpgradeProgramBody, actor: Actor) {
    if (actor.role !== 'ADMIN') {
      throw new AppError(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION, 'Chỉ ADMIN được nâng chương trình', 403);
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const currentRes = await client.query(`SELECT * FROM enrollments WHERE id = $1 FOR UPDATE`, [body.enrollmentId]);
      const current = currentRes.rows[0] as Record<string, unknown> | undefined;
      if (!current || String(current.status) !== 'active') {
        throw new AppError(ERROR_CODES.ENROLLMENT_NOT_FOUND, 'Enrollment không tồn tại hoặc không active', 404);
      }

      const oldProgramId = String(current.program_id);
      const studentId = String(current.student_id);
      const tuitionFee = Number(current.tuition_fee);
      const sessionsAttended = Number(current.sessions_attended ?? 0);
      const credit = Math.floor((tuitionFee * (24 - sessionsAttended)) / 24);

      const npRes = await client.query(`SELECT id, code, default_fee FROM programs WHERE id = $1`, [body.newProgramId]);
      const newProgram = npRes.rows[0] as { id: string; code: string; default_fee: number } | undefined;
      if (!newProgram) {
        throw new AppError(ERROR_CODES.PROGRAM_NOT_FOUND, 'Không tìm thấy chương trình mới', 404);
      }

      const ncRes = await client.query(`SELECT id, status, program_id FROM classes WHERE id = $1`, [body.newClassId]);
      const newClass = ncRes.rows[0] as { id: string; status: string; program_id: string } | undefined;
      if (!newClass) {
        throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp mới', 404);
      }
      if (newClass.program_id !== newProgram.id) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp mới phải thuộc chương trình mới', 422);
      }
      if (!['pending', 'active'].includes(newClass.status)) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp mới không nhận học viên', 422);
      }

      const additionalFee = Number(newProgram.default_fee) - credit;
      const transferGroupId = randomUUID();

      await client.query(
        `INSERT INTO receipts (
          receipt_code, payer_name, student_id, enrollment_id, reason, amount, amount_in_words,
          payment_method, payment_date, created_by, transfer_group_id
        )
         SELECT $1, s.full_name, e.student_id, e.id, $2, $3, $4, 'transfer', CURRENT_DATE, $5, $6
         FROM enrollments e
         JOIN students s ON s.id = e.student_id
         WHERE e.id = $7`,
        [
          generateEimCode('PT'),
          'Khấu trừ credit nâng chương trình',
          -credit,
          amountToWordsVi(-credit),
          actor.id,
          transferGroupId,
          body.enrollmentId,
        ],
      );

      await client.query(
        `UPDATE enrollments SET status = 'dropped', updated_at = now() WHERE id = $1`,
        [body.enrollmentId],
      );

      const newEnrollmentId = randomUUID();
      await client.query(
        `INSERT INTO enrollments (
          id, student_id, program_id, class_id, status, tuition_fee, enrolled_at, created_by
        ) VALUES ($1, $2, $3, $4, 'active', $5, now(), $6)`,
        [newEnrollmentId, studentId, newProgram.id, newClass.id, Number(newProgram.default_fee), actor.id],
      );

      if (additionalFee !== 0) {
        await client.query(
          `INSERT INTO receipts (
            receipt_code, payer_name, student_id, enrollment_id, reason, amount, amount_in_words,
            payment_method, payment_date, created_by, transfer_group_id
          )
           SELECT $1, s.full_name, $2, $3, $4, $5, $6, 'transfer', CURRENT_DATE, $7, $8
           FROM students s
           WHERE s.id = $2`,
          [
            generateEimCode('PT'),
            studentId,
            newEnrollmentId,
            additionalFee > 0 ? 'Thu thêm khi nâng chương trình' : 'Hoàn chênh lệch khi nâng chương trình',
            additionalFee,
            amountToWordsVi(additionalFee),
            actor.id,
            transferGroupId,
          ],
        );
      }

      await client.query(
        `INSERT INTO enrollment_history (
          enrollment_id, action, from_status, to_status, from_program_id, to_program_id, sessions_at_action, changed_by, note
        ) VALUES ($1, 'program_changed', 'active', 'dropped', $2, $3, $4, $5, $6)`,
        [body.enrollmentId, oldProgramId, newProgram.id, sessionsAttended, actor.id, body.note ?? 'program_upgraded'],
      );

      await client.query(
        `INSERT INTO enrollment_history (
          enrollment_id, action, from_status, to_status, from_program_id, to_program_id, sessions_at_action, changed_by, note
        ) VALUES ($1, 'enrolled', NULL, 'active', $2, $3, 0, $4, $5)`,
        [newEnrollmentId, oldProgramId, newProgram.id, actor.id, 'program_upgraded_in'],
      );

      await client.query(
        `INSERT INTO program_upgrade_requests (
          old_enrollment_id, new_enrollment_id, student_id, old_program_id, new_program_id,
          credit_amount, additional_fee, requested_by, status, note
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'completed',$9)`,
        [
          body.enrollmentId,
          newEnrollmentId,
          studentId,
          oldProgramId,
          newProgram.id,
          credit,
          additionalFee,
          actor.id,
          body.note ?? null,
        ],
      );

      await client.query(
        `UPDATE students SET current_level = $1 WHERE id = $2`,
        [newProgram.code, studentId],
      );

      await client.query('COMMIT');
      return { success: true, newEnrollmentId, credit, additionalFee };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

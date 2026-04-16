import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { TransferEnrollmentSchema } from '../dtos/enrollment.dto';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { amountToWordsVi } from '../../../shared/utils/amount-to-words';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

type Actor = { id: string; role: string; ip?: string };

/**
 * POST /enrollments/transfer — chuyển nhượng học phí từ HV A (enrollment nguồn) sang HV B, ghi danh B vào lớp đích.
 * Toàn bộ trong một transaction.
 */
export class TransferEnrollmentUseCase {
  constructor(private readonly db: Pool) {}

  async execute(body: unknown, actor: Actor) {
    if (!['ADMIN', 'ACADEMIC'].includes(actor.role)) {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Chỉ ADMIN hoặc ACADEMIC mới thực hiện chuyển nhượng học phí',
        403,
      );
    }

    const { fromEnrollmentId, toStudentId, toClassId } = TransferEnrollmentSchema.parse(body);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const enrRes = await client.query(
        `SELECT * FROM enrollments WHERE id = $1 FOR UPDATE`,
        [fromEnrollmentId],
      );
      const fromRow = enrRes.rows[0] as Record<string, unknown> | undefined;
      if (!fromRow || String(fromRow.status) !== 'active') {
        throw new AppError(
          ERROR_CODES.ENROLLMENT_NOT_FOUND,
          'Enrollment not found or not active',
          404,
        );
      }

      const fromStudentId = String(fromRow.student_id);
      const fromClassId = String(fromRow.class_id);
      const fromProgramId = String(fromRow.program_id);
      const tuitionFee = Number(fromRow.tuition_fee);
      const sessionsAttended = Number(fromRow.sessions_attended ?? 0);

      if (fromStudentId === toStudentId) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Không thể chuyển nhượng cho cùng một học viên', 422);
      }

      const fromStudentRes = await client.query(`SELECT id, full_name, is_active FROM students WHERE id = $1`, [
        fromStudentId,
      ]);
      const fromStudent = fromStudentRes.rows[0] as { full_name: string } | undefined;
      if (!fromStudent) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Học viên nguồn không tồn tại', 404);
      }

      const toStudentRes = await client.query(`SELECT id, full_name, is_active FROM students WHERE id = $1`, [
        toStudentId,
      ]);
      const toStudent = toStudentRes.rows[0] as { full_name: string; is_active: boolean } | undefined;
      if (!toStudent) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Học viên nhận không tồn tại', 404);
      }
      if (!toStudent.is_active) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Học viên nhận không còn hoạt động', 422);
      }

      const classRes = await client.query(`SELECT * FROM classes WHERE id = $1`, [toClassId]);
      const toClass = classRes.rows[0] as { id: string; program_id: string; status: string; max_capacity: number } | undefined;
      if (!toClass) {
        throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Lớp đích không tồn tại', 404);
      }
      if (!['pending', 'active'].includes(toClass.status)) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp đích không ở trạng thái nhận học viên', 422);
      }

      const activeOther = await client.query(
        `SELECT id FROM enrollments WHERE student_id = $1 AND status IN ('trial','active','paused') LIMIT 1`,
        [toStudentId],
      );
      if (activeOther.rows[0]) {
        throw new AppError(
          ERROR_CODES.ENROLLMENT_ALREADY_ACTIVE,
          'Học viên nhận đang có ghi danh đang hiệu lực — không thể nhận chuyển nhượng',
          422,
        );
      }

      const capRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM enrollments WHERE class_id = $1 AND status IN ('trial','active')`,
        [toClassId],
      );
      const activeInClass = Number(capRes.rows[0]?.c ?? 0);
      if (activeInClass >= Number(toClass.max_capacity)) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp đích đã đủ sĩ số', 422);
      }

      const sessionsRemaining = 24 - sessionsAttended;
      if (sessionsRemaining <= 0) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Không còn buổi học để chuyển nhượng', 422);
      }

      const amountTransferred = Math.floor((tuitionFee * sessionsRemaining) / 24);
      if (amountTransferred <= 0) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Số tiền chuyển nhượng không hợp lệ', 422);
      }

      const transferGroupId = randomUUID();
      const newEnrollmentId = randomUUID();

      const toProgramId = String(toClass.program_id);

      const debitReceiptCode = generateEimCode('PT');
      const debitReceipt = await client.query(
        `INSERT INTO receipts (
           receipt_code, payer_name, student_id, enrollment_id, reason, amount, amount_in_words,
           payment_method, payment_date, created_by, transfer_group_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'transfer', CURRENT_DATE, $8,$9)
         RETURNING id`,
        [
          debitReceiptCode,
          fromStudent.full_name,
          fromStudentId,
          fromEnrollmentId,
          'Chuyển nhượng học phí',
          -amountTransferred,
          amountToWordsVi(-amountTransferred),
          actor.id,
          transferGroupId,
        ],
      );
      const debitReceiptId = String((debitReceipt.rows[0] as { id: string }).id);

      await client.query(
        `INSERT INTO enrollments (
           id, student_id, program_id, class_id, status, tuition_fee, enrolled_at, created_by
         ) VALUES ($1,$2,$3,$4,'active',$5,now(),$6)`,
        [newEnrollmentId, toStudentId, toProgramId, toClassId, amountTransferred, actor.id],
      );

      const creditReceiptCode = generateEimCode('PT');
      const creditReceipt = await client.query(
        `INSERT INTO receipts (
           receipt_code, payer_name, student_id, enrollment_id, reason, amount, amount_in_words,
           payment_method, payment_date, created_by, transfer_group_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,'transfer', CURRENT_DATE, $8,$9)
         RETURNING id`,
        [
          creditReceiptCode,
          toStudent.full_name,
          toStudentId,
          newEnrollmentId,
          'Nhận chuyển nhượng học phí',
          amountTransferred,
          amountToWordsVi(amountTransferred),
          actor.id,
          transferGroupId,
        ],
      );
      const creditReceiptId = String((creditReceipt.rows[0] as { id: string }).id);

      await client.query(`UPDATE enrollments SET status = 'transferred', updated_at = now() WHERE id = $1`, [
        fromEnrollmentId,
      ]);

      await client.query(
        `INSERT INTO enrollment_history (
           enrollment_id, action, from_status, to_status,
           from_class_id, to_class_id, from_program_id, to_program_id,
           sessions_at_action, changed_by, note
         ) VALUES ($1,'transferred_out','active','transferred',$2,$3,$4,$5,$6,$7,$8)`,
        [
          fromEnrollmentId,
          fromClassId,
          toClassId,
          fromProgramId,
          toProgramId,
          sessionsAttended,
          actor.id,
          `Chuyển nhượng học phí sang học viên ${toStudent.full_name}`,
        ],
      );

      await client.query(
        `INSERT INTO enrollment_history (
           enrollment_id, action, from_status, to_status,
           from_class_id, to_class_id, from_program_id, to_program_id,
           sessions_at_action, changed_by, note
         ) VALUES ($1,'transferred_in',NULL,'active',$2,$3,$4,$5,0,$6,$7)`,
        [
          newEnrollmentId,
          fromClassId,
          toClassId,
          fromProgramId,
          toProgramId,
          actor.id,
          `Nhận chuyển nhượng từ enrollment ${fromEnrollmentId}`,
        ],
      );

      await client.query(
        `INSERT INTO transfer_requests (
           from_student_id, to_student_id, from_enrollment_id, to_enrollment_id,
           sessions_remaining, amount_transferred, status,
           debit_receipt_id, credit_receipt_id, processed_by, processed_at
         ) VALUES ($1,$2,$3,$4,$5,$6,'completed',$7,$8,$9,now())`,
        [
          fromStudentId,
          toStudentId,
          fromEnrollmentId,
          newEnrollmentId,
          sessionsRemaining,
          amountTransferred,
          debitReceiptId,
          creditReceiptId,
          actor.id,
        ],
      );

      await client.query('COMMIT');

      return {
        success: true,
        transferGroupId,
        amountTransferred,
        sessionsRemaining,
        newEnrollmentId,
        debitReceiptId,
        creditReceiptId,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

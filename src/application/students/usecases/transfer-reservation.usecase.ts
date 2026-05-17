/**
 * Q38 — Chuyển phí giữ chỗ sang lớp/chương trình khác (credit qua phiếu transfer).
 * Phần credit dư sau 20% mới được trừ vào 80% còn lại khi kích hoạt.
 */
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { TransferReservationSchema } from '../dtos/enrollment.dto';
import { resolveClassRefToId } from '../../classes/utils/resolve-class-ref';
import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { amountToWordsVi } from '../../../shared/utils/amount-to-words';
import { computeReservationFee } from '../../../shared/utils/reservation-fee';

type Actor = { id: string; role: string; ip?: string };

export class TransferReservationUseCase {
  constructor(
    private readonly db: Pool,
    private readonly classRepo: IClassRepo,
  ) {}

  async execute(dto: unknown, actor: Actor) {
    if (!['ADMIN', 'ACADEMIC'].includes(actor.role)) {
      throw new AppError(
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION,
        'Bạn không có quyền thực hiện chức năng này',
        403,
      );
    }

    const { enrollmentId, newClassId: newClassRef, reasonDetail } =
      TransferReservationSchema.parse(dto);
    const newClassId = await resolveClassRefToId(this.classRepo, newClassRef);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const currentRes = await client.query(`SELECT * FROM enrollments WHERE id = $1 FOR UPDATE`, [
        enrollmentId,
      ]);
      const current = currentRes.rows[0] as Record<string, unknown> | undefined;
      if (!current || String(current.status) !== 'reserved') {
        throw new AppError(
          ERROR_CODES.ENROLLMENT_INVALID_STATUS,
          'Chỉ có thể chuyển giữ chỗ từ ghi danh reserved',
          422,
        );
      }

      if (Number(current.sessions_attended ?? 0) > 0) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Không thể chuyển sau khi đã có buổi học', 422);
      }

      const paidRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric AS paid FROM receipts WHERE enrollment_id = $1`,
        [enrollmentId],
      );
      const credit = Number(paidRes.rows[0]?.paid ?? 0);

      const ncRes = await client.query(
        `SELECT c.id, c.status, c.program_id, c.max_capacity, p.default_fee
         FROM classes c
         JOIN programs p ON p.id = c.program_id
         WHERE c.id = $1`,
        [newClassId],
      );
      const newClass = ncRes.rows[0] as
        | { id: string; status: string; program_id: string; max_capacity: number; default_fee: number }
        | undefined;
      if (!newClass) {
        throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp mới', 404);
      }
      if (!['pending', 'active'].includes(newClass.status)) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp mới không nhận học viên', 422);
      }
      if (String(newClass.id) === String(current.class_id)) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Lớp mới phải khác lớp hiện tại', 422);
      }

      const capRes = await client.query(
        `SELECT COUNT(*)::int AS c FROM enrollments
         WHERE class_id = $1 AND status IN ('trial', 'active')`,
        [newClassId],
      );
      if (Number(capRes.rows[0]?.c ?? 0) >= Number(newClass.max_capacity)) {
        throw new AppError(ERROR_CODES.CLASS_CAPACITY_EXCEEDED, 'Lớp mới đã đủ sĩ số', 409);
      }

      const ratioRes = await client.query(
        `SELECT value FROM system_config WHERE key = 'reservation_fee_ratio' LIMIT 1`,
      );
      const ratioRaw = ratioRes.rows[0]?.value;
      const ratio = Number(ratioRaw ?? 0.2);
      const feeRatio = Number.isFinite(ratio) && ratio > 0 && ratio < 1 ? ratio : 0.2;

      const newTuition = Number(newClass.default_fee);
      const newReservationFee = computeReservationFee(newTuition, feeRatio);
      const appliedToDeposit = Math.min(credit, newReservationFee);
      const appliedToRemaining = Math.max(0, credit - appliedToDeposit);
      const depositShortfall = Math.max(0, newReservationFee - credit);

      const studentId = String(current.student_id);
      const transferGroupId = randomUUID();

      if (credit > 0) {
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
            'Khấu trừ phí giữ chỗ khi chuyển chương trình/lớp',
            -credit,
            amountToWordsVi(-credit),
            actor.id,
            transferGroupId,
            enrollmentId,
          ],
        );
      }

      await client.query(`UPDATE enrollments SET status = 'dropped', updated_at = now() WHERE id = $1`, [
        enrollmentId,
      ]);

      await client.query(
        `INSERT INTO enrollment_history (
          enrollment_id, action, from_status, to_status, changed_by, note
        ) VALUES ($1, 'dropped', 'reserved', 'dropped', $2, $3)`,
        [
          enrollmentId,
          actor.id,
          `reservation_transferred: ${reasonDetail} — credit=${credit}, deposit=${appliedToDeposit}, remaining_prepaid=${appliedToRemaining}`,
        ],
      );

      const newEnrollmentId = randomUUID();
      await client.query(
        `INSERT INTO enrollments (
          id, student_id, program_id, class_id, status, tuition_fee, reservation_fee,
          sessions_attended, sessions_absent, class_transfer_count, pause_count, makeup_blocked,
          enrolled_at, created_by
        ) VALUES ($1, $2, $3, $4, 'reserved', $5, $6, 0, 0, 0, 0, false, now(), $7)`,
        [
          newEnrollmentId,
          studentId,
          newClass.program_id,
          newClass.id,
          newTuition,
          newReservationFee,
          actor.id,
        ],
      );

      if (credit > 0) {
        await client.query(
          `INSERT INTO receipts (
            receipt_code, payer_name, student_id, enrollment_id, reason, amount, amount_in_words,
            payment_method, payment_date, created_by, transfer_group_id
          )
           SELECT $1, s.full_name, $2, $3, $4, $5, $6, 'transfer', CURRENT_DATE, $7, $8
           FROM students s WHERE s.id = $2`,
          [
            generateEimCode('PT'),
            studentId,
            newEnrollmentId,
            `Chuyển phí giữ chỗ từ ghi danh ${enrollmentId}`,
            credit,
            amountToWordsVi(credit),
            actor.id,
            transferGroupId,
          ],
        );
      }

      await client.query(
        `INSERT INTO enrollment_history (
          enrollment_id, action, from_status, to_status, to_class_id, to_program_id, changed_by, note
        ) VALUES ($1, 'enrolled', NULL, 'reserved', $2, $3, $4, $5)`,
        [
          newEnrollmentId,
          newClass.id,
          newClass.program_id,
          actor.id,
          `Q38: Chuyển giữ chỗ — credit=${credit}, cần thu thêm deposit=${depositShortfall}`,
        ],
      );

      await client.query('COMMIT');

      return {
        oldEnrollmentId: enrollmentId,
        newEnrollmentId,
        credit,
        newTuition,
        newReservationFee,
        appliedToDeposit,
        appliedToRemaining,
        depositShortfall,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

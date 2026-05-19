import { Pool } from 'pg';
import { z } from 'zod';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import {
  assertSameProgram,
  assertTargetClassBehindStudent,
  computeTransferAmount,
  getClassCompletedSessions,
} from '../helpers/transfer-enrollment.helpers';

const PreviewQuerySchema = z.object({
  toStudentId: z.string().uuid(),
  toClassId: z.string().uuid(),
});

export class GetTransferTuitionPreviewUseCase {
  constructor(private readonly db: Pool) {}

  async execute(fromEnrollmentId: string, query: unknown) {
    const { toStudentId, toClassId } = PreviewQuerySchema.parse(query);

    const enrRes = await this.db.query(`SELECT * FROM enrollments WHERE id = $1`, [fromEnrollmentId]);
    const fromRow = enrRes.rows[0] as Record<string, unknown> | undefined;
    if (!fromRow || String(fromRow.status) !== 'active') {
      throw new AppError(
        ERROR_CODES.ENROLLMENT_NOT_FOUND,
        'Ghi danh nguồn không tồn tại hoặc không ở trạng thái active',
        404,
      );
    }

    const fromStudentId = String(fromRow.student_id);
    const fromProgramId = String(fromRow.program_id);
    const tuitionFee = Number(fromRow.tuition_fee);
    const sessionsAttended = Number(fromRow.sessions_attended ?? 0);

    let blockReason: string | null = null;
    let eligible = true;

    if (fromStudentId === toStudentId) {
      eligible = false;
      blockReason = 'Không thể chuyển nhượng cho cùng một học viên';
    }

    const receiptsRes = await this.db.query(
      `SELECT amount::numeric AS amount FROM receipts WHERE enrollment_id = $1`,
      [fromEnrollmentId],
    );
    const receipts = receiptsRes.rows.map((r: { amount: string | number }) => ({
      amount: Number(r.amount),
    }));
    const { sessionsRemaining, remainingTuitionValue, netPaid, amountTransferred } = computeTransferAmount(
      tuitionFee,
      sessionsAttended,
      receipts,
    );

    if (eligible && sessionsRemaining <= 0) {
      eligible = false;
      blockReason = 'Không còn buổi học để chuyển nhượng';
    }

    if (eligible && amountTransferred <= 0) {
      eligible = false;
      blockReason = 'Không đủ số tiền đã thu để chuyển nhượng';
    }

    const classRes = await this.db.query(`SELECT * FROM classes WHERE id = $1`, [toClassId]);
    const toClass = classRes.rows[0] as
      | { program_id: string; status: string; max_capacity: number }
      | undefined;
    if (!toClass) {
      eligible = false;
      blockReason = blockReason ?? 'Lớp đích không tồn tại';
    } else if (eligible) {
      try {
        assertSameProgram(fromProgramId, String(toClass.program_id));
      } catch (e) {
        eligible = false;
        blockReason = e instanceof AppError ? e.message : 'Khác chương trình học';
      }
    }

    let classCompletedSessions = 0;
    if (toClass) {
      classCompletedSessions = await getClassCompletedSessions(this.db, toClassId);
      if (eligible) {
        try {
          assertTargetClassBehindStudent(classCompletedSessions, sessionsAttended);
        } catch (e) {
          eligible = false;
          blockReason = e instanceof AppError ? e.message : 'Lớp đích không phù hợp tiến độ';
        }
        if (eligible && !['pending', 'active'].includes(toClass.status)) {
          eligible = false;
          blockReason = 'Lớp đích không ở trạng thái nhận học viên';
        }
        if (eligible) {
          const capRes = await this.db.query(
            `SELECT COUNT(*)::int AS c FROM enrollments WHERE class_id = $1 AND status IN ('trial','active')`,
            [toClassId],
          );
          if (Number(capRes.rows[0]?.c ?? 0) >= Number(toClass.max_capacity)) {
            eligible = false;
            blockReason = 'Lớp đích đã đủ sĩ số';
          }
        }
      }
    }

    if (eligible) {
      const activeOther = await this.db.query(
        `SELECT id FROM enrollments WHERE student_id = $1 AND status IN ('trial','active','paused') LIMIT 1`,
        [toStudentId],
      );
      if (activeOther.rows[0]) {
        eligible = false;
        blockReason = 'Học viên nhận đang có ghi danh đang hiệu lực';
      }
    }

    const partialTransfer = remainingTuitionValue > netPaid && amountTransferred > 0;

    return {
      eligible,
      blockReason,
      sessionsAttended,
      sessionsRemaining,
      remainingTuitionValue,
      netPaid,
      amountTransferred,
      classCompletedSessions,
      partialTransfer,
      partialTransferNote: partialTransfer
        ? `Chỉ chuyển được ${amountTransferred.toLocaleString('vi-VN')}đ theo số tiền đã thu (giá trị buổi còn lại: ${remainingTuitionValue.toLocaleString('vi-VN')}đ)`
        : null,
    };
  }
}

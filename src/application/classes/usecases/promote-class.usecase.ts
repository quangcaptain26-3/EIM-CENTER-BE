import type { Pool, PoolClient } from "pg";
import { AppError } from "../../../shared/errors/app-error";
import type { EnrollmentEligibilityService } from "../../students/services/enrollment-eligibility.service";
import type { CreateInvoiceUseCase } from "../../finance/usecases/create-invoice.usecase";

type PromoteInput = {
  /** Lớp đích — null/undefined: enrollment mới chưa xếp lớp (PENDING) */
  toClassId?: string | null;
  /** true = học lại cùng level, bỏ qua kiểm tra thứ tự program */
  isRepeat?: boolean;
  note?: string;
  startDate?: string;
  closeSourceClass?: boolean;
};

type PromoteResult = {
  fromClassId: string;
  toClassId: string | null;
  promotedCount: number;
  closedSourceClass: boolean;
};

export class PromoteClassUseCase {
  constructor(
    private readonly dbPool: Pool,
    private readonly eligibilityService: EnrollmentEligibilityService,
    private readonly createInvoiceUseCase: CreateInvoiceUseCase,
  ) {}

  async execute(fromClassId: string, input: PromoteInput, actorUserId?: string): Promise<PromoteResult> {
    const toClassId = input.toClassId ?? null;
    const isRepeat = input.isRepeat ?? false;

    if (toClassId !== null && fromClassId === toClassId) {
      throw AppError.badRequest("Lớp đích promotion không được trùng lớp nguồn");
    }

    const client: PoolClient = await this.dbPool.connect();
    try {
      await client.query("BEGIN");

      // 1. Lock classes (giảm deadlock)
      if (toClassId) {
        const [id1, id2] = [fromClassId, toClassId].sort();
        await client.query(`SELECT id FROM classes WHERE id IN ($1, $2) ORDER BY id FOR UPDATE`, [id1, id2]);
      } else {
        await client.query(`SELECT id FROM classes WHERE id = $1 FOR UPDATE`, [fromClassId]);
      }

      // 2. Lấy thông tin lớp nguồn và chương trình (để kiểm tra thứ tự lên lớp)
      const fromClassRes = await client.query(
        `SELECT c.id, c.status, c.program_id, cp.sort_order AS program_sort_order, cp.name AS program_name
         FROM classes c
         JOIN curriculum_programs cp ON cp.id = c.program_id
         WHERE c.id = $1`,
        [fromClassId],
      );
      if (fromClassRes.rows.length === 0) {
        throw AppError.notFound("Không tìm thấy lớp nguồn để promotion");
      }
      const fromClass = fromClassRes.rows[0];
      const fromProgramSortOrder = fromClass.program_sort_order ?? 99;

      // 3. Kiểm tra lớp đích (nếu có) và thứ tự chương trình
      if (toClassId) {
        const toClassRes = await client.query(
          `SELECT c.id, c.status, c.program_id, cp.sort_order AS program_sort_order, cp.name AS program_name
           FROM classes c
           JOIN curriculum_programs cp ON cp.id = c.program_id
           WHERE c.id = $1`,
          [toClassId],
        );
        if (toClassRes.rows.length === 0) {
          throw AppError.notFound("Không tìm thấy lớp đích để promotion");
        }
        const toClass = toClassRes.rows[0];
        if (toClass.status !== "ACTIVE") {
          throw AppError.badRequest(
            `Chỉ được promotion sang lớp ACTIVE. Trạng thái lớp đích: ${toClass.status}`,
          );
        }

        if (!isRepeat) {
          // Lên lớp: lớp đích phải thuộc chương trình TIẾP THEO (đọc từ DB theo sort_order)
          const nextProgramRes = await client.query(
            `SELECT id FROM curriculum_programs WHERE sort_order > $1 ORDER BY sort_order ASC LIMIT 1`,
            [fromProgramSortOrder],
          );
          if (nextProgramRes.rows.length === 0) {
            throw AppError.badRequest(
              "Đây là chương trình cao nhất, không thể lên lớp tiếp. Dùng isRepeat=true nếu học lại cùng level.",
              { code: "PROMOTION_HIGHEST_PROGRAM", programName: fromClass.program_name },
            );
          }
          const nextProgramId = nextProgramRes.rows[0].id;
          if (toClass.program_id !== nextProgramId) {
            throw AppError.badRequest(
              `Lớp đích phải thuộc chương trình tiếp theo (hiện tại: ${fromClass.program_name}). Dùng isRepeat=true cho học lại cùng level.`,
              { code: "PROMOTION_WRONG_PROGRAM" },
            );
          }
        } else {
          // Học lại: lớp đích phải cùng chương trình với lớp nguồn
          if (toClass.program_id !== fromClass.program_id) {
            throw AppError.badRequest(
              "Học lại (isRepeat) yêu cầu lớp đích cùng chương trình với lớp nguồn.",
              { code: "REPEAT_DIFFERENT_PROGRAM" },
            );
          }
        }
      } else {
        // Không có lớp đích: chờ xếp lớp — kiểm tra không phải chương trình cao nhất (trừ khi học lại)
        if (!isRepeat) {
          const nextProgramRes = await client.query(
            `SELECT id FROM curriculum_programs WHERE sort_order > $1 ORDER BY sort_order ASC LIMIT 1`,
            [fromProgramSortOrder],
          );
          if (nextProgramRes.rows.length === 0) {
            throw AppError.badRequest(
              "Đây là chương trình cao nhất, không thể lên lớp tiếp. Cần chỉ định lớp đích hoặc dùng isRepeat=true để học lại.",
              { code: "PROMOTION_HIGHEST_PROGRAM", programName: fromClass.program_name },
            );
          }
        }
      }

      // 4. Lấy danh sách enrollments đang ACTIVE/PAUSED trong lớp nguồn
      const sourceEnrollments = await client.query(
        `SELECT id, student_id, class_id, status
         FROM enrollments
         WHERE class_id = $1 AND status IN ('ACTIVE', 'PAUSED')
         FOR UPDATE`,
        [fromClassId],
      );

      // 5. Chặn promotion nếu có học viên còn nợ quá hạn
      for (const row of sourceEnrollments.rows) {
        const hasOverdue = await this.eligibilityService.studentHasOverdue(row.student_id);
        if (hasOverdue) {
          throw AppError.badRequest(
            `Không thể promotion: học viên có hóa đơn quá hạn chưa thanh toán (student_id: ${row.student_id})`,
            { code: "ENROLLMENT_BLOCKED_OVERDUE", studentId: row.student_id },
          );
        }
      }

      const startDate = input.startDate ? new Date(input.startDate) : new Date();
      const noteSuffix = isRepeat ? " (Học lại)" : "";
      const noteBase =
        input.note ??
        (toClassId
          ? `Promotion sang lớp mới${noteSuffix}`
          : `Kết thúc khóa — chờ xếp lớp tiếp theo${noteSuffix}`);
      let promotedCount = 0;

      for (const row of sourceEnrollments.rows) {
        // 6. Đóng enrollment cũ TRƯỚC: GRADUATED, end_date (đảm bảo không 2 ACTIVE/PAUSED cùng lúc)
        await client.query(
          `UPDATE enrollments SET status = 'GRADUATED', end_date = $1 WHERE id = $2`,
          [startDate, row.id],
        );
        await client.query(
          `INSERT INTO enrollment_history (enrollment_id, from_status, to_status, note, changed_by, from_class_id, to_class_id)
           VALUES ($1, $2, 'GRADUATED', $3, $4, $5, $6)`,
          [row.id, row.status, noteBase, actorUserId ?? null, fromClassId, toClassId],
        );

        // 7. Tạo enrollment mới — status: ACTIVE nếu có lớp, PENDING nếu chưa xếp lớp
        const newStatus = toClassId ? "ACTIVE" : "PENDING";
        const inserted = await client.query(
          `INSERT INTO enrollments (student_id, class_id, status, start_date, source_enrollment_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [row.student_id, toClassId, newStatus, startDate, row.id],
        );
        const historyNote = toClassId
          ? `Tạo enrollment từ promotion${noteSuffix}`
          : `Tạo enrollment chờ xếp lớp (promotion)${noteSuffix}`;
        await client.query(
          `INSERT INTO enrollment_history (enrollment_id, from_status, to_status, note, changed_by, from_class_id, to_class_id)
           VALUES ($1, $2, $2, $3, $4, $5, $6)`,
          [inserted.rows[0].id, newStatus, historyNote, actorUserId ?? null, fromClassId, toClassId],
        );

        // 8. Khi có lớp đích — tạo invoice DRAFT cho kỳ học mới
        if (toClassId) {
          const newEnrollmentId = inserted.rows[0].id as string;
          const dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + 30);
          try {
            await this.createInvoiceUseCase.execute({
              enrollmentId: newEnrollmentId,
              dueDate: dueDate.toISOString().slice(0, 10),
            });
          } catch (err) {
            console.warn(`[PromoteClass] Không tạo được invoice cho enrollment ${newEnrollmentId}:`, err);
          }
        }

        promotedCount += 1;
      }

      // 9. Đóng lớp nguồn nếu cấu hình
      const shouldCloseSource = input.closeSourceClass !== false;
      if (shouldCloseSource) {
        await client.query(`UPDATE classes SET status = 'CLOSED' WHERE id = $1`, [fromClassId]);
      }

      await client.query("COMMIT");
      return {
        fromClassId,
        toClassId,
        promotedCount,
        closedSourceClass: shouldCloseSource,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

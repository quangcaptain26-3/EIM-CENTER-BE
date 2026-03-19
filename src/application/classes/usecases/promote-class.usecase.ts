import type { Pool, PoolClient } from "pg";
import { AppError } from "../../../shared/errors/app-error";

type PromoteInput = {
  toClassId: string;
  note?: string;
  startDate?: string;
  closeSourceClass?: boolean;
};

type PromoteResult = {
  fromClassId: string;
  toClassId: string;
  promotedCount: number;
  closedSourceClass: boolean;
};

export class PromoteClassUseCase {
  constructor(private readonly dbPool: Pool) {}

  async execute(fromClassId: string, input: PromoteInput, actorUserId?: string): Promise<PromoteResult> {
    if (fromClassId === input.toClassId) {
      throw AppError.badRequest("Lớp đích promotion không được trùng lớp nguồn");
    }

    const client: PoolClient = await this.dbPool.connect();
    try {
      await client.query("BEGIN");

      // Lock theo thứ tự cố định để giảm deadlock.
      const [firstId, secondId] = [fromClassId, input.toClassId].sort();
      await client.query(`SELECT id FROM classes WHERE id IN ($1, $2) ORDER BY id FOR UPDATE`, [firstId, secondId]);

      const fromClassRes = await client.query(`SELECT id, status FROM classes WHERE id = $1`, [fromClassId]);
      const toClassRes = await client.query(`SELECT id, status FROM classes WHERE id = $1`, [input.toClassId]);
      if (fromClassRes.rows.length === 0) throw AppError.notFound("Không tìm thấy lớp nguồn để promotion");
      if (toClassRes.rows.length === 0) throw AppError.notFound("Không tìm thấy lớp đích để promotion");
      if (toClassRes.rows[0].status !== "ACTIVE") {
        throw AppError.badRequest(`Chỉ được promotion sang lớp ACTIVE. Trạng thái lớp đích: ${toClassRes.rows[0].status}`);
      }

      const sourceEnrollments = await client.query(
        `SELECT id, student_id, class_id, status
         FROM enrollments
         WHERE class_id = $1 AND status IN ('ACTIVE', 'PAUSED')
         FOR UPDATE`,
        [fromClassId],
      );

      const startDate = input.startDate ? new Date(input.startDate) : new Date();
      let promotedCount = 0;
      for (const row of sourceEnrollments.rows) {
        await client.query(
          `UPDATE enrollments SET status = 'GRADUATED', end_date = $1 WHERE id = $2`,
          [startDate, row.id],
        );
        await client.query(
          `INSERT INTO enrollment_history (enrollment_id, from_status, to_status, note, changed_by, from_class_id, to_class_id)
           VALUES ($1, $2, 'GRADUATED', $3, $4, $5, $6)`,
          [row.id, row.status, input.note ?? "Promotion sang lớp mới", actorUserId ?? null, fromClassId, input.toClassId],
        );

        const inserted = await client.query(
          `INSERT INTO enrollments (student_id, class_id, status, start_date)
           VALUES ($1, $2, 'ACTIVE', $3)
           RETURNING id`,
          [row.student_id, input.toClassId, startDate],
        );
        await client.query(
          `INSERT INTO enrollment_history (enrollment_id, from_status, to_status, note, changed_by, from_class_id, to_class_id)
           VALUES ($1, 'ACTIVE', 'ACTIVE', $2, $3, $4, $5)`,
          [inserted.rows[0].id, "Tạo enrollment từ promotion", actorUserId ?? null, fromClassId, input.toClassId],
        );
        promotedCount += 1;
      }

      const shouldCloseSource = input.closeSourceClass !== false;
      if (shouldCloseSource) {
        await client.query(`UPDATE classes SET status = 'CLOSED' WHERE id = $1`, [fromClassId]);
      }

      await client.query("COMMIT");
      return {
        fromClassId,
        toClassId: input.toClassId,
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

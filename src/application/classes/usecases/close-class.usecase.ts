import type { Pool, PoolClient } from "pg";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { AppError } from "../../../shared/errors/app-error";
import { AuditWriter } from "../../system/usecases/audit-writer";

export type CloseClassInput = {
  /** Khi true: chuyển tất cả enrollment ACTIVE/PAUSED sang GRADUATED trước khi đóng lớp (bám thiết kế kết thúc khóa) */
  completeRemainingEnrollments?: boolean;
};

export class CloseClassUseCase {
  constructor(
    private readonly classRepo: ClassRepoPort,
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly auditWriter: AuditWriter,
    private readonly dbPool: Pool
  ) {}

  async execute(classId: string, actorUserId: string, input?: CloseClassInput) {
    const completeRemaining = input?.completeRemainingEnrollments ?? true;

    // 1. Kiểm tra class tồn tại
    const existingClass = await this.classRepo.findById(classId);
    if (!existingClass) {
      throw AppError.notFound(`Không tìm thấy lớp học với ID: ${classId}`);
    }

    // 2. Kiểm tra chưa closed
    if (existingClass.status === "CLOSED") {
      throw AppError.badRequest("Lớp học đã ở trạng thái DISABLED/CLOSED", "CLASS_ALREADY_CLOSED");
    }

    let updatedClass;
    let completedCount = 0;

    if (completeRemaining) {
      // 3a. Transaction: complete enrollments rồi đóng lớp
      const client: PoolClient = await this.dbPool.connect();
      try {
        await client.query("BEGIN");

        const enrollments = await this.enrollmentRepo.listByClassId(
          classId,
          ["ACTIVE", "PAUSED"],
          { tx: client as { query: (text: string, params?: unknown[]) => Promise<unknown> } }
        );

        const today = new Date();
        for (const enr of enrollments) {
          await client.query(
            `UPDATE enrollments SET status = 'GRADUATED', end_date = COALESCE(end_date, $1::date) WHERE id = $2`,
            [today, enr.id]
          );
          await this.enrollmentRepo.createHistory(
            enr.id,
            enr.status,
            "GRADUATED",
            "Kết thúc khóa — đóng lớp",
            {
              changedBy: actorUserId,
              fromClassId: enr.classId,
              toClassId: enr.classId,
            },
            { tx: client as { query: (text: string, params?: unknown[]) => Promise<unknown> } }
          );
          completedCount += 1;
        }

        await client.query(`UPDATE classes SET status = 'CLOSED' WHERE id = $1`, [classId]);
        await client.query("COMMIT");
        updatedClass = await this.classRepo.findById(classId);
        if (!updatedClass) throw AppError.notFound(`Lớp học ${classId} không tồn tại`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } else {
      // 3b. Chỉ đóng lớp, không động vào enrollment
      updatedClass = await this.classRepo.update(classId, { status: "CLOSED" as const });
    }

    // 4. Audit Log
    await this.auditWriter.write(actorUserId, "CLASS_STATUS_CLOSE", "class", classId, {
      before: { status: existingClass.status },
      after: { status: "CLOSED" },
      completeRemainingEnrollments: completeRemaining,
      completedCount,
    });

    return updatedClass;
  }
}

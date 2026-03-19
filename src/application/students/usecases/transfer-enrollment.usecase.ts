import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { TransferEnrollmentBody } from "../dtos/enrollment.dto";
import { StudentsMapper } from "../mappers/students.mapper";
import { AppError } from "../../../shared/errors/app-error";
import type { Pool, PoolClient } from "pg";

export class TransferEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly dbPool: Pool,
  ) {}

  async execute(id: string, input: TransferEnrollmentBody, actorUserId?: string) {
    const client: PoolClient = await this.dbPool.connect();
    try {
      await client.query("BEGIN");
      const oldEnrollment = await this.enrollmentRepo.findById(id, { tx: client });
      if (!oldEnrollment) {
        throw AppError.notFound(`Không tìm thấy bản ghi danh gốc với ID: ${id}`);
      }

      if (oldEnrollment.status !== "ACTIVE" && oldEnrollment.status !== "PAUSED") {
        throw AppError.badRequest(`Chỉ có thể chuyển đổi lớp học với bản ghi có trạng thái ACTIVE hoặc PAUSED. Hiện tại: ${oldEnrollment.status}`);
      }

      if (oldEnrollment.classId === input.toClassId) {
        throw AppError.badRequest("Lớp chuyển đến trùng với lớp hiện tại");
      }

      const targetClassRes = await client.query(
        `SELECT id, status FROM classes WHERE id = $1 FOR UPDATE`,
        [input.toClassId],
      );
      if (targetClassRes.rows.length === 0) {
        throw AppError.notFound("Không tìm thấy lớp học đích để chuyển");
      }
      if (targetClassRes.rows[0].status !== "ACTIVE") {
        throw AppError.badRequest(`Chỉ được chuyển vào lớp ACTIVE. Trạng thái hiện tại: ${targetClassRes.rows[0].status}`);
      }

      const today = new Date();

      await client.query(
        `UPDATE enrollments SET end_date = $1, status = 'TRANSFERRED' WHERE id = $2`,
        [today, id],
      );
      await this.enrollmentRepo.createHistory(id, oldEnrollment.status, "TRANSFERRED", input.note || "Chuyển lớp", {
        changedBy: actorUserId ?? null,
        fromClassId: oldEnrollment.classId,
        toClassId: input.toClassId,
      }, { tx: client });

      const newEnrollment = await this.enrollmentRepo.create({
        studentId: oldEnrollment.studentId,
        classId: input.toClassId,
        status: "ACTIVE",
        startDate: today,
      }, { tx: client });

      await this.enrollmentRepo.createHistory(newEnrollment.id, "ACTIVE", "ACTIVE", "Tạo enrollment mới từ chuyển lớp", {
        changedBy: actorUserId ?? null,
        fromClassId: oldEnrollment.classId,
        toClassId: input.toClassId,
      }, { tx: client });

      await client.query("COMMIT");
      return {
        oldEnrollment: StudentsMapper.toEnrollmentResponse({ ...oldEnrollment, status: "TRANSFERRED", endDate: today }),
        newEnrollment: StudentsMapper.toEnrollmentResponse(newEnrollment)
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

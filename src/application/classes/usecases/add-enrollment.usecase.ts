import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { RosterRepoPort } from "../../../domain/classes/repositories/roster.repo.port";
import { AddEnrollmentBody } from "../dtos/class.dto";
import { AppError } from "../../../shared/errors/app-error";
import { canEnroll } from "../../../domain/classes/services/class-capacity.rule";
import type { Pool, PoolClient } from "pg";
import type { EnrollmentEligibilityService } from "../../students/services/enrollment-eligibility.service";

export class AddEnrollmentToClassUseCase {
  constructor(
    private readonly classRepo: ClassRepoPort,
    private readonly rosterRepo: RosterRepoPort,
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly dbPool: Pool,
    private readonly eligibilityService: EnrollmentEligibilityService,
  ) {}

  /**
   * EDGE CASE C — Thêm học sinh vào lớp đã chạy (vd: lớp đã có 5 session):
   * Option A (đang dùng): KHÔNG tạo session_feedback record trống cho các session đã qua.
   * Lý do: getAttendanceSummaries dùng LEFT JOIN — học sinh không có record vẫn tính totalSessions,
   * absent_count=0. Export feedback xử lý học sinh mới bằng cách bỏ qua session trước startDate.
   */
  async execute(classId: string, input: AddEnrollmentBody, actorUserId?: string | null) {
    // Transaction + lock class row để chống race vượt capacity.
    const client: PoolClient = await this.dbPool.connect();
    try {
      await client.query("BEGIN");

      // 1) Lock class row
      const classRes = await client.query(
        `SELECT id, code, capacity, status FROM classes WHERE id = $1 FOR UPDATE`,
        [classId],
      );
      if (classRes.rows.length === 0) {
        throw AppError.notFound(`Không tìm thấy lớp học với ID: ${classId}`);
      }
      const existingClass = classRes.rows[0] as { id: string; code: string; capacity: number; status: string };

      if (existingClass.status !== "ACTIVE") {
        throw AppError.badRequest(`Không thể thêm học viên vào lớp có trạng thái ${existingClass.status}`);
      }

      // 2) Count ACTIVE enrollments trong cùng transaction (ổn định khi có concurrent adds)
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM enrollments WHERE class_id = $1 AND status = 'ACTIVE'`,
        [classId],
      );
      const currentCount = Number(countRes.rows[0]?.cnt ?? 0);
      if (!canEnroll(currentCount, existingClass.capacity)) {
        throw new AppError(`Khóa học đã đạt giới hạn học viên (${existingClass.capacity})`, "CLASS_FULL", 400);
      }

      // 3) Nếu thêm enrollment đã có
      if (input.enrollmentId) {
        const enrollment = await this.enrollmentRepo.findById(input.enrollmentId, { tx: client });
        if (!enrollment) {
          throw AppError.notFound(`Không tìm thấy enrollment với ID: ${input.enrollmentId}`);
        }

        // R4: Chặn nếu học viên còn nợ quá hạn
        const hasOverdue = await this.eligibilityService.studentHasOverdue(enrollment.studentId);
        if (hasOverdue) {
          throw AppError.badRequest(
            "Học viên có hóa đơn quá hạn chưa thanh toán. Vui lòng xử lý nợ trước khi thêm vào lớp.",
            { code: "ENROLLMENT_BLOCKED_OVERDUE", studentId: enrollment.studentId },
          );
        }

        if (enrollment.classId === classId) {
          throw AppError.badRequest("Học viên đã ở trong lớp học này");
        }

        const updated = await this.enrollmentRepo.updateClassId(input.enrollmentId, classId, { tx: client });
        await this.enrollmentRepo.createHistory(
          input.enrollmentId,
          enrollment.status,
          enrollment.status,
          `Được thêm vào lớp học: ${existingClass.code}`,
          {
            changedBy: actorUserId ?? null,
            fromClassId: enrollment.classId,
            toClassId: classId,
          },
          { tx: client },
        );

        await client.query("COMMIT");
        return updated;
      }

      // 4) Nếu tạo enrollment mới
      if (input.studentId && input.startDate) {
        // R4: Chặn nếu học viên còn nợ quá hạn
        const hasOverdue = await this.eligibilityService.studentHasOverdue(input.studentId);
        if (hasOverdue) {
          throw AppError.badRequest(
            "Học viên có hóa đơn quá hạn chưa thanh toán. Vui lòng xử lý nợ trước khi thêm vào lớp.",
            { code: "ENROLLMENT_BLOCKED_OVERDUE", studentId: input.studentId },
          );
        }

        // R5: Chặn parallel enrollment — 1 học sinh chỉ 1 enrollment ACTIVE/PAUSED
        const existingEnrollments = await this.enrollmentRepo.listByStudent(input.studentId);
        const hasActive = existingEnrollments.some((e) => e.status === "ACTIVE" || e.status === "PAUSED");
        if (hasActive) {
          throw AppError.badRequest(
            "Học viên đã có lớp đang học. Vui lòng chuyển lớp hoặc kết thúc lớp hiện tại trước khi thêm vào lớp mới.",
            { code: "ENROLLMENT_ONE_ACTIVE_PER_STUDENT", studentId: input.studentId },
          );
        }

        const newEnrollment = await this.enrollmentRepo.create(
          {
            studentId: input.studentId,
            classId: classId,
            status: "ACTIVE",
            startDate: new Date(input.startDate),
          },
          { tx: client },
        );

        await this.enrollmentRepo.createHistory(
          newEnrollment.id,
          "ACTIVE",
          "ACTIVE",
          `Tạo enrollment mới và xếp vào lớp: ${existingClass.code}`,
          {
            changedBy: actorUserId ?? null,
            fromClassId: null,
            toClassId: classId,
          },
          { tx: client },
        );

        await client.query("COMMIT");
        return newEnrollment;
      }

      throw AppError.badRequest("Input không hợp lệ, thiếu dữ liệu enrollment");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

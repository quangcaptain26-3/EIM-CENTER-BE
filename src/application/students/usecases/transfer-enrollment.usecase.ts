import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { InvoiceRepoPort } from "../../../domain/finance/repositories/invoice.repo.port";
import { TransferEnrollmentBody } from "../dtos/enrollment.dto";
import { StudentsMapper } from "../mappers/students.mapper";
import { AppError } from "../../../shared/errors/app-error";
import type { Pool, PoolClient } from "pg";
import type { EnrollmentEligibilityService } from "../services/enrollment-eligibility.service";
import type { CreateInvoiceUseCase } from "../../finance/usecases/create-invoice.usecase";
import { canEnroll } from "../../../domain/classes/services/class-capacity.rule";

/**
 * UseCase chuyển lớp giữa chừng (cùng chương trình).
 * - Enrollment cũ → status TRANSFERRED, end_date = effectiveDate.
 * - Enrollment mới tạo với current_unit_no, current_lesson_no (lớp mới biết học sinh học đến đâu).
 * - Lưu ngày chuyển, lý do, người thực hiện vào enrollment_history.
 * - Feedback/score gắn session+student — không ảnh hưởng khi chuyển lớp.
 */
export class TransferEnrollmentUseCase {
  constructor(
    private readonly enrollmentRepo: EnrollmentRepoPort,
    private readonly classRepo: ClassRepoPort,
    private readonly dbPool: Pool,
    private readonly eligibilityService: EnrollmentEligibilityService,
    private readonly invoiceRepo: InvoiceRepoPort,
    private readonly createInvoiceUseCase: CreateInvoiceUseCase,
  ) {}

  async execute(id: string, input: TransferEnrollmentBody, actorUserId?: string) {
    // 1. Resolve toClassId (ưu tiên toClassCode)
    let toClassId: string;
    if (input.toClassCode?.trim()) {
      const cls = await this.classRepo.findByCode(input.toClassCode.trim());
      if (!cls) {
        throw AppError.notFound(`Không tìm thấy lớp học đích với mã: ${input.toClassCode.trim()}`);
      }
      toClassId = cls.id;
    } else if (input.toClassId) {
      toClassId = input.toClassId;
    } else {
      throw AppError.badRequest("Cần cung cấp toClassId hoặc toClassCode (mã lớp đích)");
    }

    const client = await this.dbPool.connect();
    try {
      await client.query("BEGIN");

      // 2. Lấy enrollment cũ
      const oldEnrollment = await this.enrollmentRepo.findById(id, { tx: client });
      if (!oldEnrollment) {
        throw AppError.notFound(`Không tìm thấy bản ghi danh gốc với ID: ${id}`);
      }

      if (oldEnrollment.status !== "ACTIVE" && oldEnrollment.status !== "PAUSED") {
        throw AppError.badRequest(
          `Chỉ có thể chuyển lớp với bản ghi ACTIVE hoặc PAUSED. Hiện tại: ${oldEnrollment.status}`,
        );
      }

      if (oldEnrollment.classId === toClassId) {
        throw AppError.badRequest("Lớp chuyển đến trùng với lớp hiện tại");
      }

      // 3. Chặn nếu học viên còn nợ quá hạn
      const hasOverdue = await this.eligibilityService.studentHasOverdue(oldEnrollment.studentId);
      if (hasOverdue) {
        throw AppError.badRequest(
          "Học viên có hóa đơn quá hạn chưa thanh toán. Vui lòng xử lý nợ trước khi chuyển lớp.",
          { code: "ENROLLMENT_BLOCKED_OVERDUE", studentId: oldEnrollment.studentId },
        );
      }

      const effectiveDate = input.effectiveDate ? new Date(input.effectiveDate) : new Date();
      effectiveDate.setHours(0, 0, 0, 0);

      // 4. Validate lớp đích: tồn tại, ACTIVE, CÙNG CHƯƠNG TRÌNH, còn capacity
      const targetClassRes = await client.query(
        `SELECT c.id, c.status, c.capacity, c.program_id
         FROM classes c
         WHERE c.id = $1 FOR UPDATE`,
        [toClassId],
      );
      if (targetClassRes.rows.length === 0) {
        throw AppError.notFound("Không tìm thấy lớp học đích để chuyển");
      }
      const targetClass = targetClassRes.rows[0] as { status: string; capacity: number; program_id: string };

      if (targetClass.status !== "ACTIVE") {
        throw AppError.badRequest(
          `Chỉ được chuyển vào lớp ACTIVE. Trạng thái hiện tại: ${targetClass.status}`,
        );
      }

      // Chuyển lớp = cùng chương trình — lấy program_id lớp cũ
      const fromClassRes = await client.query(
        `SELECT program_id FROM classes WHERE id = $1`,
        [oldEnrollment.classId],
      );
      if (fromClassRes.rows.length === 0 || fromClassRes.rows[0].program_id !== targetClass.program_id) {
        throw AppError.badRequest("Chỉ được chuyển sang lớp cùng chương trình. Chuyển khác chương trình dùng Promotion.", {
          code: "TRANSFER_DIFFERENT_PROGRAM",
        });
      }

      // 5. Kiểm tra capacity bằng class-capacity.rule, trả 409 nếu đầy
      const countRes = await client.query(
        `SELECT COUNT(*)::INT AS cnt FROM enrollments WHERE class_id = $1 AND status = 'ACTIVE'`,
        [toClassId],
      );
      const activeCount = Number(countRes.rows[0]?.cnt ?? 0);
      if (!canEnroll(activeCount, targetClass.capacity)) {
        throw AppError.conflict("Lớp đích đã đạt giới hạn học viên (capacity)", {
          code: "CLASS_FULL",
          capacity: targetClass.capacity,
        });
      }

      // 6. Lấy unit_no, lesson_no tại thời điểm chuyển (buổi học cuối của lớp cũ trước effectiveDate)
      let transferUnitNo: number | null = null;
      let transferLessonNo: number | null = null;
      const lastSessionRes = await client.query(
        `SELECT unit_no, lesson_no FROM sessions
         WHERE class_id = $1 AND session_date <= $2
         ORDER BY session_date DESC, unit_no DESC, lesson_no DESC
         LIMIT 1`,
        [oldEnrollment.classId, effectiveDate],
      );
      if (lastSessionRes.rows.length > 0) {
        transferUnitNo = lastSessionRes.rows[0].unit_no;
        transferLessonNo = lastSessionRes.rows[0].lesson_no;
      }

      // 7. Cancel các invoice mở trên enrollment cũ
      const oldInvoices = await this.invoiceRepo.list({ enrollmentId: id, limit: 100 });
      const cancellable = ["DRAFT", "ISSUED", "OVERDUE"];
      for (const inv of oldInvoices) {
        if (cancellable.includes(inv.status)) {
          await this.invoiceRepo.updateStatus(inv.id, "CANCELED");
        }
      }

      // 8. Đóng enrollment cũ: status = TRANSFERRED, end_date = effectiveDate
      await client.query(
        `UPDATE enrollments SET end_date = $1, status = 'TRANSFERRED' WHERE id = $2`,
        [effectiveDate, id],
      );
      const noteTransfer = input.note?.trim() || "Chuyển lớp";
      await this.enrollmentRepo.createHistory(
        id,
        oldEnrollment.status,
        "TRANSFERRED",
        noteTransfer,
        {
          changedBy: actorUserId ?? null,
          fromClassId: oldEnrollment.classId,
          toClassId,
          transferUnitNo,
          transferLessonNo,
        },
        { tx: client },
      );

      // 9. Tạo enrollment mới — start_date = effectiveDate, current_unit_no/lesson_no để lớp mới biết tiến độ
      const newEnrollment = await this.enrollmentRepo.create(
        {
          studentId: oldEnrollment.studentId,
          classId: toClassId,
          status: "ACTIVE",
          startDate: effectiveDate,
          currentUnitNo: transferUnitNo,
          currentLessonNo: transferLessonNo,
        },
        { tx: client },
      );
      await this.enrollmentRepo.createHistory(
        newEnrollment.id,
        "ACTIVE",
        "ACTIVE",
        `Chuyển lớp từ ${oldEnrollment.classId ?? "?"} — ${noteTransfer}`,
        {
          changedBy: actorUserId ?? null,
          fromClassId: oldEnrollment.classId,
          toClassId,
        },
        { tx: client },
      );

      await client.query("COMMIT");

      // 10. Tạo invoice mới cho enrollment mới (sau commit)
      try {
        const dueDate = new Date(effectiveDate);
        dueDate.setDate(dueDate.getDate() + 30);
        await this.createInvoiceUseCase.execute({
          enrollmentId: newEnrollment.id,
          dueDate: dueDate.toISOString().slice(0, 10),
        });
      } catch (err) {
        console.warn(`[Transfer] Không tạo được invoice cho enrollment mới ${newEnrollment.id}:`, err);
      }

      return {
        oldEnrollment: StudentsMapper.toEnrollmentResponse({
          ...oldEnrollment,
          status: "TRANSFERRED",
          endDate: effectiveDate,
        }),
        newEnrollment: StudentsMapper.toEnrollmentResponse(newEnrollment),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

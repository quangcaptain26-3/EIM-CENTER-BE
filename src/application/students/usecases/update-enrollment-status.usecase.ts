import { EnrollmentRepoPort } from "../../../domain/students/repositories/enrollment.repo.port";
import { UpdateEnrollmentStatusBody } from "../dtos/enrollment.dto";
import { StudentsMapper } from "../mappers/students.mapper";
import { AppError } from "../../../shared/errors/app-error";
import { canTransition } from "../../../domain/students/services/enrollment-transition.rule";
import { EnrollmentStatus } from "../../../domain/students/entities/enrollment.entity";

export class UpdateEnrollmentStatusUseCase {
  constructor(private readonly enrollmentRepo: EnrollmentRepoPort) {}

  async execute(id: string, input: UpdateEnrollmentStatusBody, actorUserId?: string) {
    const fromEnrollment = await this.enrollmentRepo.findById(id);
    if (!fromEnrollment) {
      throw AppError.notFound(`Không tìm thấy bản ghi danh với ID: ${id}`);
    }

    const toStatus = input.status as EnrollmentStatus;

    if (!canTransition(fromEnrollment.status, toStatus)) {
      throw AppError.badRequest(`Không thể chuyển trạng thái từ ${fromEnrollment.status} sang ${toStatus}.`);
    }

    // Option A (đơn giản): Khi enrollment PAUSED hoặc DROPPED — giữ nguyên invoice, không tự động cancel.
    // Lý do: Để kế toán xử lý thủ công (hoàn tiền, điều chỉnh) theo quy trình nội bộ.
    // Invoice DRAFT/ISSUED/OVERDUE vẫn giữ nguyên; có thể cancel/hủy riêng qua API finance nếu cần.

    // Trạng thái kết thúc (GRADUATED, DROPPED, TRANSFERRED): repo tự set end_date nếu chưa có
    const updated = await this.enrollmentRepo.updateStatus(id, toStatus, input.note);
    await this.enrollmentRepo.createHistory(id, fromEnrollment.status, toStatus, input.note, {
      changedBy: actorUserId ?? null,
      fromClassId: fromEnrollment.classId,
      toClassId: fromEnrollment.classId,
    });

    return StudentsMapper.toEnrollmentResponse(updated);
  }
}

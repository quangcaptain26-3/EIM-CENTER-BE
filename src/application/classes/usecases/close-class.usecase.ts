import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import { AppError } from "../../../shared/errors/app-error";
import { AuditWriter } from "../../system/usecases/audit-writer";

export class CloseClassUseCase {
  constructor(
    private readonly classRepo: ClassRepoPort,
    private readonly auditWriter: AuditWriter
  ) {}

  async execute(classId: string, actorUserId: string) {
    // 1. Kiểm tra class tồn tại
    const existingClass = await this.classRepo.findById(classId);
    if (!existingClass) {
      throw AppError.notFound(`Không tìm thấy lớp học với ID: ${classId}`);
    }

    // 2. Kiểm tra chưa closed
    if (existingClass.status === "CLOSED") {
      throw AppError.badRequest("Lớp học đã ở trạng thái DISABLED/CLOSED", "CLASS_ALREADY_CLOSED");
    }

    // 3. Cập nhật status
    const updatedClass = await this.classRepo.update(classId, {
      status: "CLOSED",
    });

    // 4. Thêm Audit Log
    await this.auditWriter.write(actorUserId, "CLASS_STATUS_CLOSE", "class", classId, {
      before: { status: existingClass.status },
      after: { status: "CLOSED" },
    });

    return updatedClass;
  }
}

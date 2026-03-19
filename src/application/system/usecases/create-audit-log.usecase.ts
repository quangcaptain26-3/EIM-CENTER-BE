import { AuditCreateInput } from "../../../domain/system/repositories/audit.repo.port";
import { mapAuditLog } from "../mappers/system.mapper";
import { AuditWriter } from "./audit-writer";

/**
 * UseCase: Tạo một bản ghi audit log mới.
 * Dùng cho nội bộ — thường được gọi qua AuditWriter, không phải HTTP endpoint.
 */
export class CreateAuditLogUseCase {
  constructor(private readonly auditWriter: AuditWriter) {}

  async execute(input: AuditCreateInput) {
    // Chuẩn hóa: luôn đi qua AuditWriter để đảm bảo meta được làm sạch và failure được monitoring.
    await this.auditWriter.write(
      input.actorUserId,
      input.action,
      input.entity,
      input.entityId,
      (input.meta ?? {}) as Record<string, unknown>,
    );

    // API này hiện chỉ dùng nội bộ; để tối giản, trả về payload gần giống entity tạo.
    // Nếu cần trả về record từ DB (id/createdAt), nên mở rộng AuditWriter để trả lại AuditLog.
    return mapAuditLog({
      id: "",
      actorUserId: input.actorUserId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      meta: (input.meta ?? {}) as Record<string, any>,
      createdAt: new Date(),
    });
  }
}

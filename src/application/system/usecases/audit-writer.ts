import { AuditRepoPort } from "../../../domain/system/repositories/audit.repo.port";
import { buildMetaSafe } from "../../../domain/system/services/audit.rule";
import { AuditFailureMonitor } from "../services/audit-failure.monitor";

/**
 * AuditWriter – Helper dùng chung cho toàn bộ ứng dụng.
 *
 * Cách dùng ở module khác:
 *   container.system.auditWriter.write(
 *     actorUserId,      // UUID user thực hiện hành động (hoặc undefined)
 *     "STUDENT_CREATE", // action
 *     "student",        // entity
 *     student.id,       // entityId (hoặc undefined)
 *     { name: "..." }   // meta bổ sung
 *   );
 *
 * AuditWriter tự xử lý:
 *  - Làm sạch meta (loại bỏ field nhạy cảm)
 *  - Không nuốt lỗi audit: nếu ghi thất bại sẽ phát tín hiệu monitoring và throw
 *    để upstream quyết định rollback/abort.
 */
export class AuditWriter {
  constructor(private readonly auditRepo: AuditRepoPort) {}

  /**
   * Ghi một audit log.
   * Hàm này không bao giờ ném lỗi để đảm bảo flow nghiệp vụ chính không bị ảnh hưởng.
   *
   * @param actorUserId - UUID người thực hiện (undefined nếu hệ thống)
   * @param action      - Tên hành động, ví dụ: "AUTH_LOGIN", "STUDENT_CREATE"
   * @param entity      - Tên đối tượng bị tác động, ví dụ: "student"
   * @param entityId    - UUID bản ghi bị tác động (undefined nếu không áp dụng)
   * @param meta        - Thông tin bổ sung (sẽ được làm sạch tự động)
   */
  async write(
    actorUserId: string | undefined,
    action:      string,
    entity:      string,
    entityId?:   string,
    meta:        Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const safeMeta = buildMetaSafe(meta);
      await this.auditRepo.create({ actorUserId, action, entity, entityId, meta: safeMeta });
    } catch (err) {
      // Monitoring/alert trước khi throw để không bị "mất dấu" lỗi.
      AuditFailureMonitor.notify({ actorUserId, action, entity, entityId, error: err });
      throw err;
    }
  }
}

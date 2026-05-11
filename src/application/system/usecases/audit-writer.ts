import { IAuditRepo } from '../../../domain/system/repositories/audit.repo.port';

/** Các field không được lưu vào old_values / new_values */
const SENSITIVE_FIELDS = ['password_hash', 'token', 'token_hash', 'refreshToken', 'refresh_token', 'password', 'passwordHash'];

function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const key of SENSITIVE_FIELDS) {
    if (key in out) delete out[key];
  }
  return out;
}

/**
 * Input event cho AuditWriter.write()
 */
export interface AuditEvent {
  actorId?: string;
  actorCode?: string;
  actorRole?: string;
  actorIp?: string;
  actorAgent?: string;

  /** format: 'DOMAIN:event' — ví dụ: 'AUTH:login', 'USER:created' */
  action: string;

  entityType?: string;
  entityId?: string;
  entityCode?: string;

  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;

  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * AuditWriter — service duy nhất để ghi audit log trong toàn bộ hệ thống.
 *
 * Được inject vào tất cả usecases qua constructor.
 * KHÔNG BAO GIỜ throw exception — mọi lỗi chỉ được log ra console.error.
 * Fire-and-forget: usecases có thể gọi write() mà không cần await.
 */
export class AuditWriter {
  constructor(private readonly auditRepo: IAuditRepo) {}

  /**
   * Ghi một audit event.
   *
   * Tự động tính diff từ oldValues + newValues.
   * Catch toàn bộ lỗi, không bao giờ throw để tránh làm crash usecase.
   */
  async write(event: AuditEvent): Promise<void> {
    try {
      const oldValues = event.oldValues ? redactSensitive(event.oldValues) : undefined;
      const newValues = event.newValues ? redactSensitive(event.newValues) : undefined;

      let diff: Record<string, unknown> | undefined;
      if (oldValues && newValues) {
        diff = this.computeDiff(oldValues, newValues);
      }

      await this.auditRepo.create({
        actorId:     event.actorId,
        actorCode:   event.actorCode,
        actorRole:   event.actorRole,
        actorIp:     event.actorIp,
        actorAgent:  event.actorAgent,
        action:      event.action,
        entityType:  event.entityType,
        entityId:    event.entityId,
        entityCode:  event.entityCode,
        oldValues,
        newValues,
        diff,
        description: event.description,
        metadata:    event.metadata,
      });
    } catch (err) {
      // Không bao giờ throw — chỉ log để monitoring
      console.error('[AuditWriter] Failed to write audit log:', err);
    }
  }

  /**
   * Tính diff giữa 2 object: chỉ trả về các fields thực sự thay đổi.
   * Format: { fieldName: { from: oldValue, to: newValue } }
   *
   * Chỉ so sánh shallow (1 level) — đủ cho usecase audit.
   */
  private computeDiff(
    old: Record<string, unknown>,
    next: Record<string, unknown>,
  ): Record<string, { from: unknown; to: unknown }> {
    const changed: Record<string, { from: unknown; to: unknown }> = {};

    // Gom tất cả keys từ cả 2 object
    const allKeys = new Set([...Object.keys(old), ...Object.keys(next)]);

    for (const key of allKeys) {
      const oldVal = old[key];
      const newVal = next[key];

      // So sánh dùng JSON stringify để handle object / array values
      const oldStr = JSON.stringify(oldVal) ?? 'undefined';
      const newStr = JSON.stringify(newVal) ?? 'undefined';

      if (oldStr !== newStr) {
        changed[key] = { from: oldVal, to: newVal };
      }
    }

    return changed;
  }
}

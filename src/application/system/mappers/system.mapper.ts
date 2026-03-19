import { AuditLog } from "../../../domain/system/entities/audit-log.entity";
import { Notification } from "../../../domain/system/entities/notification.entity";

/**
 * Mapper: Chuẩn hoá AuditLog entity für controller/swagger response.
 */
export function mapAuditLog(log: AuditLog) {
  return {
    id:           log.id,
    actorUserId:  log.actorUserId  ?? null,
    action:       log.action,
    entity:       log.entity,
    entityId:     log.entityId ?? null,
    meta:         log.meta,
    beforeData:   log.meta?.before ?? null,
    afterData:    log.meta?.after  ?? null,
    createdAt:    log.createdAt.toISOString(),
  };
}

/**
 * Mapper: Chuẩn hoá Notification entity cho controller/swagger response.
 */
export function mapNotification(n: Notification) {
  return {
    id:        n.id,
    userId:    n.userId,
    title:     n.title,
    body:      n.body,
    isRead:    n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

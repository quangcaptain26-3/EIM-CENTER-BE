/**
 * AuditFailureMonitor
 *
 * Mục tiêu:
 * - Khi ghi audit thất bại, phải có tín hiệu rõ ràng để vận hành/monitoring phát hiện.
 * - Không phụ thuộc DB (vì DB có thể chính là thứ đang lỗi).
 *
 * Chiến lược tối thiểu:
 * - console.error dạng có cấu trúc (dễ grep/log aggregation).
 * - process.emitWarning để hệ thống cảnh báo (nếu có).
 */
export const AuditFailureMonitor = {
  notify(params: {
    actorUserId?: string;
    action: string;
    entity: string;
    entityId?: string;
    error: unknown;
  }): void {
    const payload = {
      tag: "AUDIT_WRITE_FAILED",
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      // Không stringify error quá sâu để tránh vòng lặp/PII.
      errorName: params.error instanceof Error ? params.error.name : typeof params.error,
      errorMessage: params.error instanceof Error ? params.error.message : String(params.error),
    };

    // Log dạng JSON để hệ thống log/monitor dễ parse.
    console.error(JSON.stringify(payload));

    // Emit warning để có thể hook vào process warning handler.
    // Không ném ở đây; việc throw sẽ do AuditWriter quyết định.
    try {
      process.emitWarning(`AUDIT_WRITE_FAILED action=${params.action} entity=${params.entity}`, {
        code: "AUDIT_WRITE_FAILED",
      });
    } catch {
      // Bỏ qua nếu môi trường runtime không hỗ trợ emitWarning.
    }
  },
};


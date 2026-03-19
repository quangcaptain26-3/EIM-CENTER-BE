/**
 * Entity: Nhật ký kiểm toán hệ thống (Audit Log)
 * Ghi lại mọi hành động quan trọng: ai làm gì, với entity nào, khi nào.
 */
export type AuditLog = {
  id: string;                 // UUID primary key
  actorUserId?: string;       // ID người thực hiện (null nếu là hệ thống / anonymous)
  action: string;             // Hành động, ví dụ: "AUTH_LOGIN", "STUDENT_CREATE"
  entity: string;             // Tên bảng/đối tượng bị tác động, ví dụ: "auth_user", "student"
  entityId?: string;          // UUID của bản ghi bị tác động (null nếu không áp dụng)
  meta: Record<string, any>;  // Thông tin bổ sung dạng JSON (IP, user-agent, payload diff…)
  createdAt: Date;            // Thời điểm ghi log
};

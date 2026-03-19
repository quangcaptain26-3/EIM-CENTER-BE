/**
 * rbac.policy.ts
 * Quản lý tập trung các hằng số Role và Permission của hệ thống Backend.
 */

export const RBAC_ROLES = {
  ROOT: 'ROOT',
  DIRECTOR: 'DIRECTOR',
  ACADEMIC: 'ACADEMIC',
  SALES: 'SALES',          // Chỉ quản lý tuyển sinh, không có quyền tài chính
  ACCOUNTANT: 'ACCOUNTANT', // Quản lý tài chính và hóa đơn
  TEACHER: 'TEACHER',
};

export const RBAC_PERMISSIONS = {
  AUTH_ME: 'AUTH_ME',
  STUDENT_READ: 'STUDENT_READ',
  STUDENT_WRITE: 'STUDENT_WRITE',
  FEEDBACK_WRITE: 'FEEDBACK_WRITE',
  FINANCE_READ: 'FINANCE_READ',
  FINANCE_WRITE: 'FINANCE_WRITE',
  TRIALS_READ: 'TRIALS_READ',
  TRIALS_WRITE: 'TRIALS_WRITE',
  SYSTEM_AUDIT_READ: 'SYSTEM_AUDIT_READ',
};

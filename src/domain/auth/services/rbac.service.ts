/**
 * Role-Based Access Control service.
 *
 * Pure domain service — no infrastructure imports, no database calls.
 * Permissions are defined here as the single source of truth for the system.
 */
export class RbacService {
  private static readonly PERMISSIONS: Record<string, string[]> = {
    ADMIN: ['*'],

    ACADEMIC: [
      'class:read',
      'class:create',
      'class:update',
      'class:assign_cover',
      'class:reschedule',
      'enrollment:read',
      'enrollment:create',
      'enrollment:transfer_class',
      'attendance:record',
      'makeup:create',
      'student:read',
      'student:create',
      'student:update',
      'pause_request:create',
      'search:all',
      /** Xem công nợ / trạng thái thanh toán (read-only) */
      'debt:read',
    ],

    ACCOUNTANT: [
      'receipt:create',
      'receipt:void',
      'payroll:finalize',
      'payroll:read',
      'finance:dashboard',
      'debt:read',
      'enrollment:read',
      'student:read',
    ],

    TEACHER: [
      'session:read_own',
      'attendance:record',
      'makeup:read_own',
      'payroll:read_own',
      'profile:read_own',
      /** Đọc HV / ghi danh phục vụ điểm danh & lớp được phân công */
      'student:read',
      'enrollment:read',
    ],
  };

  /**
   * Returns true if the given roleCode is permitted to perform action.
   * ADMIN always returns true (wildcard '*').
   */
  canDo(roleCode: string, action: string): boolean {
    const perms = RbacService.PERMISSIONS[roleCode];
    if (!perms) return false;
    if (perms.includes('*')) return true;
    return perms.includes(action);
  }
}

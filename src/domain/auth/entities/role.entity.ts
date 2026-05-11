export class RoleEntity {
  id: string;
  code: string; // 'ADMIN' | 'ACADEMIC' | 'ACCOUNTANT' | 'TEACHER'
  name: string;
  permissions: string[];
  createdAt: Date;

  constructor(data: {
    id: string;
    code: string;
    name: string;
    permissions: string[];
    createdAt: Date;
  }) {
    this.id = data.id;
    this.code = data.code;
    this.name = data.name;
    this.permissions = data.permissions;
    this.createdAt = data.createdAt;
  }

  /**
   * Returns true if this role is allowed to perform the given action.
   * If permissions contains '*', full access is granted.
   * Otherwise checks for an exact match in the permissions array.
   */
  hasPermission(action: string): boolean {
    if (this.permissions.includes('*')) return true;
    return this.permissions.includes(action);
  }
}

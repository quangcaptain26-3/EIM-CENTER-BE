import { RoleEntity } from '../entities/role.entity';

export class UserEntity {
  id: string;
  userCode: string;
  email: string;
  passwordHash: string;
  role: RoleEntity;
  isActive: boolean;
  fullName: string;
  gender?: 'male' | 'female' | 'other';
  dob?: Date;
  phone?: string;
  address?: string;
  cccd?: string;
  nationality: string; // default 'Việt Nam'
  ethnicity?: string;
  religion?: string;
  educationLevel?: string;
  major?: string;
  startDate?: Date;
  salaryPerSession?: number; // TEACHER only
  allowance: number; // default 0
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  constructor(data: {
    id: string;
    userCode: string;
    email: string;
    passwordHash: string;
    role: RoleEntity;
    isActive: boolean;
    fullName: string;
    gender?: 'male' | 'female' | 'other';
    dob?: Date;
    phone?: string;
    address?: string;
    cccd?: string;
    nationality?: string;
    ethnicity?: string;
    religion?: string;
    educationLevel?: string;
    major?: string;
    startDate?: Date;
    salaryPerSession?: number;
    allowance?: number;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
  }) {
    this.id = data.id;
    this.userCode = data.userCode;
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.role = data.role;
    this.isActive = data.isActive;
    this.fullName = data.fullName;
    this.gender = data.gender;
    this.dob = data.dob;
    this.phone = data.phone;
    this.address = data.address;
    this.cccd = data.cccd;
    this.nationality = data.nationality ?? 'Việt Nam';
    this.ethnicity = data.ethnicity;
    this.religion = data.religion;
    this.educationLevel = data.educationLevel;
    this.major = data.major;
    this.startDate = data.startDate;
    this.salaryPerSession = data.salaryPerSession;
    this.allowance = data.allowance ?? 0;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /** Returns true if this user has been soft-deleted. */
  isDeleted(): boolean {
    return this.deletedAt != null;
  }

  /** Delegates permission check to the associated role. */
  canDo(action: string): boolean {
    return this.role.hasPermission(action);
  }

  /**
   * Calculates how many full months have elapsed since startDate.
   * Returns 0 if startDate is not set.
   */
  getSeniorityMonths(): number {
    if (!this.startDate) return 0;

    const now = new Date();
    const start = this.startDate;

    let months =
      (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth());

    // Subtract one if we haven't yet hit the anniversary day this month
    if (now.getDate() < start.getDate()) {
      months -= 1;
    }

    return Math.max(0, months);
  }
}

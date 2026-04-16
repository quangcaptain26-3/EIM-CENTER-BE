import { UserEntity } from '../../../domain/auth/entities/user.entity';

export function toUserResponse(user: UserEntity) {
  return {
    id: user.id,
    userCode: user.userCode,
    email: user.email,
    role: {
      id: user.role.id,
      code: user.role.code,
      name: user.role.name,
      permissions: user.role.permissions,
    },
    isActive: user.isActive,
    fullName: user.fullName,
    gender: user.gender,
    dob: user.dob,
    phone: user.phone,
    address: user.address,
    cccd: user.cccd,
    nationality: user.nationality,
    ethnicity: user.ethnicity,
    religion: user.religion,
    educationLevel: user.educationLevel,
    major: user.major,
    startDate: user.startDate,
    salaryPerSession: user.salaryPerSession,
    allowance: user.allowance,
    createdBy: user.createdBy,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    seniorityMonths: user.getSeniorityMonths(),
  };
}

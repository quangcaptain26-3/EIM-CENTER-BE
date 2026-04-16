import { Pool } from 'pg';
import { IUserRepo } from '../../../domain/auth/repositories/user.repo.port';
import { IRoleRepo } from '../../../domain/auth/repositories/role.repo.port';
import { ISalaryLogRepo } from '../../../domain/auth/repositories/salary-log.repo.port';
import { IAuditLogRepo } from '../../../domain/auth/repositories/audit-log.repo.port';
import { PasswordHasher } from '../../../infrastructure/auth/password-hasher';
import { refreshSearchViews } from '../../../infrastructure/db/refresh-views';
import { logger } from '../../../shared/logger';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import { generateEimCode } from '../../../shared/utils/eim-code';
import { CreateUserDto, CreateUserDtoSchema } from '../dtos/user.dto';
import { toUserResponse } from '../mappers/auth.mapper';
import { Email } from '../../../domain/auth/value-objects/email.vo';

const EIM_PREFIXES: Record<string, string> = {
  ADMIN: 'ADM',
  ACADEMIC: 'NHV',
  ACCOUNTANT: 'NKT',
  TEACHER: 'GV',
};

export class CreateUserUseCase {
  constructor(
    private readonly userRepo: IUserRepo,
    private readonly roleRepo: IRoleRepo,
    private readonly salaryLogRepo: ISalaryLogRepo,
    private readonly auditLogRepo: IAuditLogRepo,
    private readonly passwordHasher: PasswordHasher,
    private readonly db: Pool,
  ) {}

  async execute(
    dto: CreateUserDto,
    actorId: string,
    actorIp: string,
    actorAgent: string,
    options?: { skipSearchRefresh?: boolean },
  ) {
    const data = CreateUserDtoSchema.parse(dto);

    // 1. Email validation & check
    const emailVo = Email.create(data.email);
    const existingEmail = await this.userRepo.findByEmail(emailVo.toString());
    if (existingEmail) {
      throw new AppError(
        ERROR_CODES.USER_EMAIL_EXISTS,
        'Email already exists',
        400,
      );
    }

    // Lookup role
    const role = await this.roleRepo.findByCode(data.roleCode);
    if (!role) {
      throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid role code', 400);
    }

    // 2. check cccd unique
    // For a real check, we should ideally add findByCccd in IUserRepo.
    // Assuming the database unique constraint will fail on duplicate, or we can check via search if needed.
    // For now, let's rely on DB constraint or skipped if not given a specific method.
    // The instructions say "Kiểm tra cccd unique nếu có" -> I will fetch by cccd if provided.
    // Wait, the repo only has findAll() that can search by cccd but it's an ILIKE. 
    // We will let the DB throw a constraint error, or we can use findAll to manually check.
    if (data.cccd) {
      const match = await this.userRepo.findAll({ search: data.cccd, page: 1, limit: 10 });
      if (match.data.some((u) => u.cccd === data.cccd)) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'CCCD already exists', 400);
      }
    }

    // 3. Hash password
    const passwordHash = await this.passwordHasher.hash(data.password);

    // 4. Sinh user_code -> Retry if exists
    let userCode = '';
    let attempts = 0;
    while (attempts < 5) {
      userCode = generateEimCode(EIM_PREFIXES[data.roleCode]);
      const existingCode = await this.userRepo.findByCode(userCode);
      if (!existingCode) {
        break;
      }
      attempts++;
    }
    if (attempts === 5) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        'Could not generate a unique user code',
        500,
      );
    }

    // 5. INSERT user
    const newUser = await this.userRepo.create({
      userCode,
      email: emailVo.toString(),
      passwordHash,
      role,
      isActive: true,
      fullName: data.fullName,
      gender: data.gender,
      dob: data.dob,
      phone: data.phone,
      address: data.address,
      cccd: data.cccd,
      nationality: data.nationality ?? 'Việt Nam',
      ethnicity: data.ethnicity,
      religion: data.religion,
      educationLevel: data.educationLevel,
      major: data.major,
      startDate: data.startDate,
      salaryPerSession: data.salaryPerSession,
      allowance: data.allowance ?? 0,
      createdBy: actorId,
    });

    // 6. INSERT salary_change_logs
    if (
      (data.salaryPerSession !== undefined && data.salaryPerSession !== null) ||
      (data.allowance !== undefined && data.allowance !== null && data.allowance > 0)
    ) {
      await this.salaryLogRepo.create({
        userId: newUser.id,
        oldSalaryPerSession: null,
        newSalaryPerSession: data.salaryPerSession ?? null,
        oldAllowance: null,
        newAllowance: data.allowance ?? 0,
        changedBy: actorId,
        reason: 'Khởi tạo tài khoản',
      });
    }

    // 7. Ghi audit log
    await this.auditLogRepo.log({
      action: 'USER:created',
      actorId,
      actorIp,
      actorAgent,
      entityType: 'user',
      entityId: newUser.id,
      entityCode: newUser.userCode,
    });

    if (!options?.skipSearchRefresh) {
      void refreshSearchViews(this.db).catch((err) => logger.error(err));
    }

    return toUserResponse(newUser);
  }
}

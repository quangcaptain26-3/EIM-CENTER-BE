import type { Pool, PoolClient } from 'pg';
import { IUserRepo } from '../../../../domain/auth/repositories/user.repo.port';
import { UserEntity } from '../../../../domain/auth/entities/user.entity';
import { RoleEntity } from '../../../../domain/auth/entities/role.entity';

type UserRow = Record<string, unknown>;

/**
 * PostgreSQL implementation of IUserRepo.
 *
 * Rules:
 *  - All queries use parameterized placeholders ($1, $2, …).
 *  - JOIN users with roles so every returned UserEntity is fully hydrated.
 *  - findById / findByEmail / findByCode never return soft-deleted rows.
 *  - softDelete sets deleted_at = now() without physically removing the row.
 *  - findAll applies WHERE deleted_at IS NULL + optional filters + ILIKE search
 *    + LIMIT / OFFSET pagination.
 */
export class UserPgRepo implements IUserRepo {
  constructor(private readonly pool: Pool | PoolClient) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private mapRow(row: UserRow): UserEntity {
    const role = new RoleEntity({
      id: row['role_id'] as string,
      code: row['role_code'] as string,
      name: row['role_name'] as string,
      permissions: Array.isArray(row['role_permissions'])
        ? (row['role_permissions'] as string[])
        : JSON.parse((row['role_permissions'] as string) ?? '[]'),
      createdAt: row['role_created_at'] as Date,
    });

    return new UserEntity({
      id: row['id'] as string,
      userCode: row['user_code'] as string,
      email: row['email'] as string,
      passwordHash: row['password_hash'] as string,
      role,
      isActive: row['is_active'] as boolean,
      fullName: row['full_name'] as string,
      gender: row['gender'] as UserEntity['gender'],
      dob: (row['dob'] as Date) ?? undefined,
      phone: (row['phone'] as string) ?? undefined,
      address: (row['address'] as string) ?? undefined,
      cccd: (row['cccd'] as string) ?? undefined,
      nationality: (row['nationality'] as string) ?? 'Việt Nam',
      ethnicity: (row['ethnicity'] as string) ?? undefined,
      religion: (row['religion'] as string) ?? undefined,
      educationLevel: (row['education_level'] as string) ?? undefined,
      major: (row['major'] as string) ?? undefined,
      startDate: (row['start_date'] as Date) ?? undefined,
      salaryPerSession:
        row['salary_per_session'] != null
          ? Number(row['salary_per_session'])
          : undefined,
      allowance: row['allowance'] != null ? Number(row['allowance']) : 0,
      createdBy: (row['created_by'] as string) ?? undefined,
      createdAt: row['created_at'] as Date,
      updatedAt: row['updated_at'] as Date,
      deletedAt: (row['deleted_at'] as Date) ?? undefined,
    });
  }

  /** Base SELECT joining users → roles */
  private get baseSelect(): string {
    return `
      SELECT
        u.id,
        u.user_code,
        u.email,
        u.password_hash,
        u.is_active,
        u.full_name,
        u.gender,
        u.dob,
        u.phone,
        u.address,
        u.cccd,
        u.nationality,
        u.ethnicity,
        u.religion,
        u.education_level,
        u.major,
        u.start_date,
        u.salary_per_session,
        u.allowance,
        u.created_by,
        u.created_at,
        u.updated_at,
        u.deleted_at,
        r.id          AS role_id,
        r.code        AS role_code,
        r.name        AS role_name,
        r.permissions AS role_permissions,
        r.created_at  AS role_created_at
      FROM users u
      JOIN roles r ON r.id = u.role_id
    `;
  }

  // ─── Interface ──────────────────────────────────────────────────────────────

  async findById(id: string): Promise<UserEntity | null> {
    const res = await this.pool.query(
      `${this.baseSelect}
       WHERE u.id = $1
         AND u.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const res = await this.pool.query(
      `${this.baseSelect}
       WHERE u.email = $1
         AND u.deleted_at IS NULL
       LIMIT 1`,
      [email.toLowerCase()],
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByCode(code: string): Promise<UserEntity | null> {
    const res = await this.pool.query(
      `${this.baseSelect}
       WHERE u.user_code = $1
         AND u.deleted_at IS NULL
       LIMIT 1`,
      [code],
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findAll(params: {
    roleCode?: string;
    isActive?: boolean;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ data: UserEntity[]; total: number }> {
    const { roleCode, isActive, search, page, limit } = params;

    const conditions: string[] = ['u.deleted_at IS NULL'];
    const values: unknown[] = [];
    let idx = 1;

    if (roleCode !== undefined) {
      conditions.push(`r.code = $${idx++}`);
      values.push(roleCode);
    }

    if (isActive !== undefined) {
      conditions.push(`u.is_active = $${idx++}`);
      values.push(isActive);
    }

    if (search && search.trim() !== '') {
      const pattern = `%${search.trim()}%`;
      conditions.push(
        `(u.full_name ILIKE $${idx} OR u.phone ILIKE $${idx} OR u.cccd ILIKE $${idx})`,
      );
      values.push(pattern);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total matching rows (without LIMIT/OFFSET)
    const countRes = await this.pool.query(
      `SELECT COUNT(*) AS total
         FROM users u
         JOIN roles r ON r.id = u.role_id
        WHERE ${whereClause}`,
      values,
    );
    const total = parseInt(countRes.rows[0]['total'] as string, 10);

    // Paginated data
    const offset = (page - 1) * limit;
    const dataRes = await this.pool.query(
      `${this.baseSelect}
       WHERE ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    );

    return {
      data: dataRes.rows.map((r) => this.mapRow(r)),
      total,
    };
  }

  async create(
    data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<UserEntity> {
    const res = await this.pool.query(
      `INSERT INTO users (
         user_code, email, password_hash, role_id, is_active,
         full_name, gender, dob, phone, address, cccd,
         nationality, ethnicity, religion, education_level, major,
         start_date, salary_per_session, allowance, created_by, deleted_at
       ) VALUES (
         $1,  $2,  $3,  $4,  $5,
         $6,  $7,  $8,  $9,  $10, $11,
         $12, $13, $14, $15, $16,
         $17, $18, $19, $20, $21
       )
       RETURNING id`,
      [
        data.userCode,
        data.email.toLowerCase(),
        data.passwordHash,
        data.role.id,
        data.isActive,
        data.fullName,
        data.gender ?? null,
        data.dob ?? null,
        data.phone ?? null,
        data.address ?? null,
        data.cccd ?? null,
        data.nationality ?? 'Việt Nam',
        data.ethnicity ?? null,
        data.religion ?? null,
        data.educationLevel ?? null,
        data.major ?? null,
        data.startDate ?? null,
        data.salaryPerSession ?? null,
        data.allowance ?? 0,
        data.createdBy ?? null,
        data.deletedAt ?? null,
      ],
    );

    const newId = res.rows[0]['id'] as string;
    const created = await this.findById(newId);
    // findById only returns null for deleted rows; this is freshly inserted
    return created!;
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        UserEntity,
        | 'fullName'
        | 'gender'
        | 'dob'
        | 'phone'
        | 'address'
        | 'cccd'
        | 'nationality'
        | 'ethnicity'
        | 'religion'
        | 'educationLevel'
        | 'major'
        | 'startDate'
        | 'salaryPerSession'
        | 'allowance'
        | 'isActive'
      >
    >,
  ): Promise<UserEntity> {
    // Build SET clause dynamically from the provided keys only
    const columnMap: Record<string, string> = {
      fullName: 'full_name',
      gender: 'gender',
      dob: 'dob',
      phone: 'phone',
      address: 'address',
      cccd: 'cccd',
      nationality: 'nationality',
      ethnicity: 'ethnicity',
      religion: 'religion',
      educationLevel: 'education_level',
      major: 'major',
      startDate: 'start_date',
      salaryPerSession: 'salary_per_session',
      allowance: 'allowance',
      isActive: 'is_active',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, col] of Object.entries(columnMap)) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        setClauses.push(`${col} = $${idx++}`);
        values.push((data as Record<string, unknown>)[key] ?? null);
      }
    }

    if (setClauses.length === 0) {
      // Nothing to update — just return the current state
      const current = await this.findById(id);
      if (!current) throw new Error(`User ${id} not found`);
      return current;
    }

    // Always bump updated_at
    setClauses.push(`updated_at = now()`);
    values.push(id);

    await this.pool.query(
      `UPDATE users
          SET ${setClauses.join(', ')}
        WHERE id = $${idx}
          AND deleted_at IS NULL`,
      values,
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error(`User ${id} not found after update`);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE users
          SET deleted_at = now(),
              updated_at = now()
        WHERE id = $1
          AND deleted_at IS NULL`,
      [id],
    );
  }
}

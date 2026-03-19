import { pool } from '../../pg-pool';
import crypto from 'crypto';
import { UserEntity } from '../../../../domain/auth/entities/user.entity';
import { UserRepoPort, UserAuthInfo, UserListParams, CreateUserData, UpdateUserData } from '../../../../domain/auth/repositories/user.repo.port';

export class UserPgRepository implements UserRepoPort {
  async findByEmail(email: string): Promise<UserEntity | null> {
    const query = `
      SELECT id, email, password_hash, full_name, status, created_at
      FROM auth_users
      WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async findById(id: string): Promise<UserEntity | null> {
    const query = `
      SELECT id, email, password_hash, full_name, status, created_at
      FROM auth_users
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async getUserAuthInfo(userId: string): Promise<UserAuthInfo | null> {
    // 1. Lấy thông tin user
    const user = await this.findById(userId);
    if (!user) return null;

    // 2. Lấy danh sách roles của user
    const rolesQuery = `
      SELECT r.code
      FROM auth_roles r
      JOIN auth_user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY CASE r.code
        WHEN 'ROOT' THEN 1
        WHEN 'DIRECTOR' THEN 2
        WHEN 'ACADEMIC' THEN 3
        WHEN 'SALES' THEN 4
        WHEN 'ACCOUNTANT' THEN 5
        WHEN 'TEACHER' THEN 6
        ELSE 100
      END
    `;
    const rolesResult = await pool.query(rolesQuery, [userId]);
    const roles = rolesResult.rows.map(row => row.code);

    // 3. Lấy danh sách permissions của user (thông qua roles)
    const permissionsQuery = `
      SELECT DISTINCT p.code
      FROM auth_permissions p
      JOIN auth_role_permissions rp ON p.id = rp.permission_id
      JOIN auth_user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
    `;
    const permissionsResult = await pool.query(permissionsQuery, [userId]);
    const permissions = permissionsResult.rows.map(row => row.code);

    return {
      user,
      roles,
      permissions
    };
  }

  async findAll(params: UserListParams): Promise<{ items: UserAuthInfo[], total: number }> {
    const limit = params.limit || 20;
    const offset = ((params.page || 1) - 1) * limit;
    const values: any[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (params.search) {
      conditions.push(`(u.email ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.status) {
      conditions.push(`u.status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    if (params.roleCode) {
      conditions.push(`r.code = $${paramIndex}`);
      values.push(params.roleCode);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(DISTINCT u.id)
      FROM auth_users u
      LEFT JOIN auth_user_roles ur ON u.id = ur.user_id
      LEFT JOIN auth_roles r ON ur.role_id = r.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const itemsQuery = `
      SELECT u.id, u.email, u.password_hash, u.full_name, u.status, u.created_at,
             COALESCE(json_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '[]') as roles
      FROM auth_users u
      LEFT JOIN auth_user_roles ur ON u.id = ur.user_id
      LEFT JOIN auth_roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const itemsResult = await pool.query(itemsQuery, [...values, limit, offset]);

    const items = await Promise.all(itemsResult.rows.map(async row => {
      const user: UserEntity = {
        id: row.id,
        email: row.email,
        password_hash: row.password_hash,
        full_name: row.full_name,
        status: row.status,
        created_at: row.created_at,
      };

      const permissionsQuery = `
        SELECT DISTINCT p.code
        FROM auth_permissions p
        JOIN auth_role_permissions rp ON p.id = rp.permission_id
        JOIN auth_user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
      `;
      const permissionsResult = await pool.query(permissionsQuery, [user.id]);
      const permissions = permissionsResult.rows.map(p => p.code);

      return {
        user,
        roles: row.roles,
        permissions
      };
    }));

    return { items, total };
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const id = data.id || crypto.randomUUID();
    const query = `
      INSERT INTO auth_users (id, email, password_hash, full_name, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, password_hash, full_name, status, created_at
    `;
    const result = await pool.query(query, [id, data.email, data.password_hash, data.full_name, data.status]);
    return result.rows[0];
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.full_name !== undefined) {
      fields.push(`full_name = $${paramIndex++}`);
      values.push(data.full_name);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (fields.length === 0) {
      const user = await this.findById(id);
      if (!user) throw new Error('User not found');
      return user;
    }

    values.push(id);
    const query = `
      UPDATE auth_users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, password_hash, full_name, status, created_at
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async assignRole(userId: string, roleCode: string): Promise<void> {
    const checkRoleQuery = `SELECT id FROM auth_roles WHERE code = $1`;
    const checkRoleResult = await pool.query(checkRoleQuery, [roleCode]);
    
    if (checkRoleResult.rows.length === 0) {
      throw new Error(`Role ${roleCode} không tồn tại`);
    }

    const roleId = checkRoleResult.rows[0].id;

    const assignQuery = `
      INSERT INTO auth_user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `;
    await pool.query(assignQuery, [userId, roleId]);
  }

  async revokeRole(userId: string, roleCode: string): Promise<void> {
    const revokeQuery = `
      DELETE FROM auth_user_roles
      WHERE user_id = $1 AND role_id = (SELECT id FROM auth_roles WHERE code = $2)
    `;
    await pool.query(revokeQuery, [userId, roleCode]);
  }

  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const query = `
      INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `;
    await pool.query(query, [userId, tokenHash, expiresAt]);
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    const query = `
      UPDATE auth_refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1
    `;
    await pool.query(query, [tokenHash]);
  }

  async findValidRefreshToken(tokenHash: string): Promise<{ userId: string; expiresAt: Date; revokedAt: Date | null } | null> {
    const query = `
      SELECT user_id as "userId", expires_at as "expiresAt", revoked_at as "revokedAt"
      FROM auth_refresh_tokens
      WHERE token_hash = $1
    `;
    const result = await pool.query(query, [tokenHash]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }
}

import type { Pool, PoolClient } from 'pg';
import { IRoleRepo } from '../../../../domain/auth/repositories/role.repo.port';
import { RoleEntity } from '../../../../domain/auth/entities/role.entity';

/**
 * PostgreSQL implementation of IRoleRepo.
 *
 * The `permissions` column is stored as a JSONB array in the database
 * and is automatically parsed by the `pg` driver into a JS string[].
 */
export class RolePgRepo implements IRoleRepo {
  constructor(private readonly pool: Pool | PoolClient) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private mapRow(row: Record<string, unknown>): RoleEntity {
    return new RoleEntity({
      id: row['id'] as string,
      code: row['code'] as string,
      name: row['name'] as string,
      // pg returns JSONB as a parsed JS value already.
      permissions: Array.isArray(row['permissions'])
        ? (row['permissions'] as string[])
        : JSON.parse((row['permissions'] as string) ?? '[]'),
      createdAt: row['created_at'] as Date,
    });
  }

  // ─── Interface ──────────────────────────────────────────────────────────────

  async findById(id: string): Promise<RoleEntity | null> {
    const res = await this.pool.query(
      `SELECT id, code, name, permissions, created_at
         FROM roles
        WHERE id = $1
        LIMIT 1`,
      [id],
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByCode(code: string): Promise<RoleEntity | null> {
    const res = await this.pool.query(
      `SELECT id, code, name, permissions, created_at
         FROM roles
        WHERE code = $1
        LIMIT 1`,
      [code],
    );
    if (res.rowCount === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async listAll(): Promise<RoleEntity[]> {
    const res = await this.pool.query(
      `SELECT id, code, name, permissions, created_at
         FROM roles
        ORDER BY name ASC`,
    );
    return res.rows.map((r) => this.mapRow(r));
  }
}

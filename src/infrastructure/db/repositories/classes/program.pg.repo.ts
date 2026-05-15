import { IProgramRepo } from '../../../../domain/classes/repositories/class.repo.port';
import { ProgramEntity } from '../../../../domain/classes/entities/program.entity';

export class ProgramPgRepo implements IProgramRepo {
  constructor(private readonly db: any) {}

  /** `SELECT *` trả snake_case — map sang camelCase để `isActive` / `defaultFee` không bị undefined (CreateClass dùng `!program.isActive`). */
  private mapRowToEntity(row: Record<string, unknown>): ProgramEntity {
    const rawActive = row.isActive ?? row.is_active;
    const isActive = rawActive === undefined || rawActive === null ? true : Boolean(rawActive);

    const df = row.defaultFee ?? row.default_fee;
    const defaultFee =
      typeof df === 'number' && Number.isFinite(df)
        ? df
        : df != null && String(df).length > 0
          ? Number(df)
          : 0;

    const ts = row.totalSessions ?? row.total_sessions;
    const totalSessions =
      typeof ts === 'number' && Number.isFinite(ts) ? ts : ts != null ? Number(ts) || 24 : 24;

    const lo = row.levelOrder ?? row.level_order;
    const levelOrder = typeof lo === 'number' && Number.isFinite(lo) ? lo : Number(lo) || 0;

    return new ProgramEntity({
      id: String(row.id ?? ''),
      code: row.code as ProgramEntity['code'],
      name: String(row.name ?? ''),
      defaultFee,
      totalSessions,
      levelOrder,
      isActive,
    });
  }

  async findById(id: string): Promise<ProgramEntity | null> {
    const result = await this.db.query(`SELECT * FROM programs WHERE id = $1`, [id]);
    if (!result.rows[0]) return null;
    return this.mapRowToEntity(result.rows[0] as Record<string, unknown>);
  }

  async findByCode(code: string): Promise<ProgramEntity | null> {
    const result = await this.db.query(`SELECT * FROM programs WHERE code = $1`, [code]);
    if (!result.rows[0]) return null;
    return this.mapRowToEntity(result.rows[0] as Record<string, unknown>);
  }

  async findAll(): Promise<ProgramEntity[]> {
    const result = await this.db.query(`SELECT * FROM programs ORDER BY level_order ASC`);
    return result.rows.map((row: Record<string, unknown>) => this.mapRowToEntity(row));
  }

  async findByLevelOrder(level: number): Promise<ProgramEntity | null> {
    const result = await this.db.query(`SELECT * FROM programs WHERE level_order = $1`, [level]);
    if (!result.rows[0]) return null;
    return this.mapRowToEntity(result.rows[0] as Record<string, unknown>);
  }
}

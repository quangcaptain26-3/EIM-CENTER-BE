import { IProgramRepo } from '../../../../domain/classes/repositories/class.repo.port';
import { ProgramEntity } from '../../../../domain/classes/entities/program.entity';

export class ProgramPgRepo implements IProgramRepo {
  constructor(private readonly db: any) {}

  async findById(id: string): Promise<ProgramEntity | null> {
    const result = await this.db.query(`SELECT * FROM programs WHERE id = $1`, [id]);
    if (!result.rows[0]) return null;
    return new ProgramEntity(result.rows[0]);
  }

  async findByCode(code: string): Promise<ProgramEntity | null> {
    const result = await this.db.query(`SELECT * FROM programs WHERE code = $1`, [code]);
    if (!result.rows[0]) return null;
    return new ProgramEntity(result.rows[0]);
  }

  async findAll(): Promise<ProgramEntity[]> {
    const result = await this.db.query(`SELECT * FROM programs ORDER BY level_order ASC`);
    return result.rows.map((row: any) => new ProgramEntity(row));
  }

  async findByLevelOrder(level: number): Promise<ProgramEntity | null> {
    const result = await this.db.query(`SELECT * FROM programs WHERE level_order = $1`, [level]);
    if (!result.rows[0]) return null;
    return new ProgramEntity(result.rows[0]);
  }
}

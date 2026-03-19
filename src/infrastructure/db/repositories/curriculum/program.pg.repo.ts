import { ProgramRepoPort } from '../../../../domain/curriculum/repositories/program.repo.port';
import { Program } from '../../../../domain/curriculum/entities/program.entity';
import { pool } from '../../pg-pool';

/**
 * Implementation PostgreSQL của Program repository
 */
export class ProgramPgRepo implements ProgramRepoPort {
  
  /**
   * Map từ kết quả database sang entity
   */
  private mapToProgram(row: any): Program {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      level: row.level,
      totalUnits: row.total_units,
      lessonsPerUnit: row.lessons_per_unit,
      sessionsPerWeek: row.sessions_per_week,
      feePlanId: row.fee_plan_id,
      createdAt: row.created_at,
    };
  }

  async listPrograms(): Promise<Program[]> {
    const query = `
      SELECT id, code, name, level, total_units, lessons_per_unit, sessions_per_week, fee_plan_id, created_at
      FROM curriculum_programs
      ORDER BY created_at DESC;
    `;
    const result = await pool.query(query);
    return result.rows.map(this.mapToProgram);
  }

  async createProgram(input: Omit<Program, 'id' | 'createdAt'>): Promise<Program> {
    const query = `
      INSERT INTO curriculum_programs (code, name, level, total_units, lessons_per_unit, sessions_per_week, fee_plan_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    
    const values = [
      input.code,
      input.name,
      input.level,
      input.totalUnits,
      input.lessonsPerUnit,
      input.sessionsPerWeek,
      input.feePlanId || null
    ];

    const result = await pool.query(query, values);
    return this.mapToProgram(result.rows[0]);
  }

  async findProgramById(id: string): Promise<Program | null> {
    const query = `
      SELECT * FROM curriculum_programs WHERE id = $1;
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) return null;
    return this.mapToProgram(result.rows[0]);
  }

  async updateProgram(id: string, patch: Partial<Omit<Program, 'id' | 'createdAt'>>): Promise<Program> {
    // Không cho phép update nếu không có id hoặc record không tồn tại
    const current = await this.findProgramById(id);
    if (!current) {
      throw new Error(`Bạn đang cần sửa Program không tồn tại (id: ${id})`);
    }

    const merged = { ...current, ...patch };

    const query = `
      UPDATE curriculum_programs
      SET 
        code = $1, 
        name = $2, 
        level = $3, 
        total_units = $4, 
        lessons_per_unit = $5, 
        sessions_per_week = $6, 
        fee_plan_id = $7
      WHERE id = $8
      RETURNING *;
    `;

    const values = [
      merged.code,
      merged.name,
      merged.level,
      merged.totalUnits,
      merged.lessonsPerUnit,
      merged.sessionsPerWeek,
      merged.feePlanId || null,
      id
    ];

    const result = await pool.query(query, values);
    return this.mapToProgram(result.rows[0]);
  }
}

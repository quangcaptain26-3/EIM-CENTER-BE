import { UnitRepoPort } from '../../../../domain/curriculum/repositories/unit.repo.port';
import { Unit, UnitLesson } from '../../../../domain/curriculum/entities/unit.entity';
import { pool } from '../../pg-pool';
import { getLessonPattern } from '../../../../domain/curriculum/services/session-type.rule';

/**
 * Implementation PostgreSQL của Unit và Lesson repository
 */
export class UnitPgRepo implements UnitRepoPort {
  
  /**
   * Helper map row query database thành thực thể Unit
   */
  private mapToUnit(row: any): Unit {
    return {
      id: row.id,
      programId: row.program_id,
      unitNo: row.unit_no,
      title: row.title,
      totalLessons: row.total_lessons,
      createdAt: row.created_at,
    };
  }

  /**
   * Helper map row query database thành thực thể UnitLesson
   */
  private mapToLesson(row: any): UnitLesson {
    return {
      id: row.id,
      unitId: row.unit_id,
      lessonNo: row.lesson_no,
      title: row.title,
      sessionPattern: row.session_pattern,
      createdAt: row.created_at,
    };
  }

  async listUnitsByProgram(programId: string): Promise<Unit[]> {
    const query = `
      SELECT id, program_id, unit_no, title, total_lessons, created_at
      FROM curriculum_units
      WHERE program_id = $1
      ORDER BY unit_no ASC;
    `;
    const result = await pool.query(query, [programId]);
    return result.rows.map(this.mapToUnit);
  }

  async createUnit(programId: string, unitNo: number, title: string): Promise<Unit> {
    const query = `
      INSERT INTO curriculum_units (program_id, unit_no, title)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(query, [programId, unitNo, title]);
    return this.mapToUnit(result.rows[0]);
  }

  async findUnitById(unitId: string): Promise<Unit | null> {
    const query = `
      SELECT id, program_id, unit_no, title, total_lessons, created_at
      FROM curriculum_units
      WHERE id = $1;
    `;
    const result = await pool.query(query, [unitId]);
    if (result.rowCount === 0) return null;
    return this.mapToUnit(result.rows[0]);
  }

  async updateUnit(unitId: string, patch: Partial<Omit<Unit, 'id' | 'programId' | 'createdAt'>>): Promise<Unit> {
    const current = await this.findUnitById(unitId);
    if (!current) {
      throw new Error(`Không tìm thấy Unit có ID: ${unitId}`);
    }

    const merged = { ...current, ...patch };
    const query = `
      UPDATE curriculum_units
      SET unit_no = $1, title = $2, total_lessons = $3
      WHERE id = $4
      RETURNING *;
    `;
    const result = await pool.query(query, [
      merged.unitNo, 
      merged.title, 
      merged.totalLessons, 
      unitId
    ]);

    return this.mapToUnit(result.rows[0]);
  }

  async upsertDefaultLessons(unitId: string): Promise<UnitLesson[]> {
    // 1. Kiểm tra số lượng lesson hiện có theo unitId
    const countQuery = `SELECT COUNT(*) FROM curriculum_unit_lessons WHERE unit_id = $1;`;
    const countResult = await pool.query(countQuery, [unitId]);
    const lessonCount = parseInt(countResult.rows[0].count, 10);

    // 2. Chèn tự động 7 lessons nếu bằng 0
    if (lessonCount === 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (let i = 1; i <= 7; i++) {
          const pattern = getLessonPattern(i);
          const insertQuery = `
            INSERT INTO curriculum_unit_lessons (unit_id, lesson_no, title, session_pattern)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (unit_id, lesson_no) DO NOTHING;
          `;
          await client.query(insertQuery, [unitId, i, `Lesson ${i}`, pattern]);
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    // 3. Lấy lại danh sách lessons
    return this.listLessons(unitId);
  }

  async listLessons(unitId: string): Promise<UnitLesson[]> {
    const query = `
      SELECT id, unit_id, lesson_no, title, session_pattern, created_at
      FROM curriculum_unit_lessons
      WHERE unit_id = $1
      ORDER BY lesson_no ASC;
    `;
    const result = await pool.query(query, [unitId]);
    return result.rows.map(this.mapToLesson);
  }
}

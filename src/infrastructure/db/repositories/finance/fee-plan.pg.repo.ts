import { pool } from "../../pg-pool";
import { FeePlan } from "../../../../domain/finance/entities/fee-plan.entity";
import { FeePlanRepoPort } from "../../../../domain/finance/repositories/fee-plan.repo.port";
import { AppError } from "../../../../shared/errors/app-error";

/**
 * Implementation PostgreSQL cho FeePlanRepoPort.
 */
export class FeePlanPgRepo implements FeePlanRepoPort {
  private mapRow(row: any): FeePlan {
    return {
      id:              row.id,
      programId:       row.program_id,
      name:            row.name,
      amount:          Number(row.amount),
      currency:        row.currency,
      sessionsPerWeek: Number(row.sessions_per_week),
      createdAt:       new Date(row.created_at),
    };
  }

  /** Lấy danh sách gói học phí, lọc theo programId nếu có */
  async list(programId?: string): Promise<FeePlan[]> {
    if (programId) {
      const { rows } = await pool.query(
        `SELECT * FROM finance_fee_plans WHERE program_id = $1 ORDER BY created_at DESC`,
        [programId]
      );
      return rows.map(this.mapRow);
    }
    const { rows } = await pool.query(
      `SELECT * FROM finance_fee_plans ORDER BY created_at DESC`
    );
    return rows.map(this.mapRow);
  }

  /** Tạo gói học phí mới */
  async create(input: Omit<FeePlan, "id" | "createdAt">): Promise<FeePlan> {
    const { rows } = await pool.query(
      `INSERT INTO finance_fee_plans (program_id, name, amount, currency, sessions_per_week)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.programId, input.name, input.amount, input.currency, input.sessionsPerWeek]
    );
    return this.mapRow(rows[0]);
  }

  /** Cập nhật thông tin gói học phí */
  async update(id: string, patch: Partial<Omit<FeePlan, "id" | "createdAt">>): Promise<FeePlan> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (patch.name            !== undefined) { fields.push(`name = $${idx++}`);              values.push(patch.name); }
    if (patch.amount          !== undefined) { fields.push(`amount = $${idx++}`);            values.push(patch.amount); }
    if (patch.currency        !== undefined) { fields.push(`currency = $${idx++}`);          values.push(patch.currency); }
    if (patch.sessionsPerWeek !== undefined) { fields.push(`sessions_per_week = $${idx++}`); values.push(patch.sessionsPerWeek); }

    if (fields.length === 0) throw new Error("Không có trường nào cần cập nhật");

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE finance_fee_plans SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (rows.length === 0) throw new Error("Không tìm thấy gói học phí để cập nhật");
    return this.mapRow(rows[0]);
  }

  /** Tìm gói học phí theo ID */
  async findById(id: string): Promise<FeePlan | null> {
    const { rows } = await pool.query(
      `SELECT * FROM finance_fee_plans WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRow(rows[0]);
  }

  /** Xóa gói học phí theo ID */
  async delete(id: string): Promise<boolean> {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM finance_fee_plans WHERE id = $1`,
        [id]
      );
      return (rowCount ?? 0) > 0;
    } catch (err: any) {
      // 23503 = foreign_key_violation
      if (err?.code === "23503") {
        throw AppError.badRequest("Không thể xóa gói học phí vì đang được dùng ở nơi khác", { feePlanId: id });
      }
      throw err;
    }
  }
}

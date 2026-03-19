import { pool } from "../../pg-pool";
import { EnrollmentHistory } from "../../../../domain/students/entities/enrollment.entity";
import { EnrollmentHistoryRepoPort } from "../../../../domain/students/repositories/enrollment-history.repo.port";

/**
 * Implementation của EnrollmentHistoryRepoPort sử dụng PostgreSQL
 */
export class EnrollmentHistoryPgRepo implements EnrollmentHistoryRepoPort {
  async listByEnrollment(enrollmentId: string): Promise<EnrollmentHistory[]> {
    const query = `
      SELECT
        id,
        enrollment_id AS "enrollmentId",
        from_status AS "fromStatus",
        to_status AS "toStatus",
        note,
        changed_by AS "changedBy",
        from_class_id AS "fromClassId",
        to_class_id AS "toClassId",
        changed_at AS "changedAt"
      FROM enrollment_history
      WHERE enrollment_id = $1
      ORDER BY changed_at ASC
    `;
    const { rows } = await pool.query(query, [enrollmentId]);
    return rows;
  }
}

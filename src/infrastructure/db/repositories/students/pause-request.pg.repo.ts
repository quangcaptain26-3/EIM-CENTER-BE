import { IPauseRequestRepo, PauseRequestEntity, PagedResult } from '../../../../domain/students/repositories/student.repo.port';

export class PauseRequestPgRepo implements IPauseRequestRepo {
  constructor(private readonly db: any) {}

  private mapToEntity(row: any): PauseRequestEntity {
    return {
      id: row.id,
      requestCode: row.request_code,
      enrollmentId: row.enrollment_id,
      requestedBy: row.requested_by,
      sessionsAttendedAtRequest: row.sessions_attended_at_request,
      status: row.status,
      reason: row.reason,
      reviewedBy: row.reviewed_by,
      reviewNote: row.review_note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findById(id: string): Promise<PauseRequestEntity | null> {
    const result = await this.db.query(`SELECT * FROM pause_requests WHERE id = $1`, [id]);
    if (!result.rows[0]) return null;
    return this.mapToEntity(result.rows[0]);
  }

  async findByEnrollment(enrollmentId: string): Promise<PauseRequestEntity[]> {
    const result = await this.db.query(`SELECT * FROM pause_requests WHERE enrollment_id = $1 ORDER BY created_at DESC`, [enrollmentId]);
    return result.rows.map((row: any) => this.mapToEntity(row));
  }

  /** Danh sách có join học viên / lớp — trả object phẳng cho API */
  async findPagedByStatus(
    status: string,
    page: number,
    limit: number,
  ): Promise<PagedResult<Record<string, unknown>>> {
    const countResult = await this.db.query(`SELECT COUNT(*) as total FROM pause_requests WHERE status = $1`, [
      status,
    ]);
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await this.db.query(
      `SELECT pr.id,
              pr.request_code as "code",
              pr.enrollment_id as "enrollmentId",
              pr.status,
              pr.reason,
              pr.review_note as "reviewNote",
              pr.created_at as "requestedAt",
              COALESCE(pr.sessions_attended_at_request, e.sessions_attended) as "sessionsAttended",
              e.student_id as "studentId",
              s.full_name as "studentName",
              s.student_code as "studentCode",
              c.class_code as "classCode",
              c.id as "classId"
       FROM pause_requests pr
       JOIN enrollments e ON e.id = pr.enrollment_id
       JOIN students s ON s.id = e.student_id
       JOIN classes c ON c.id = e.class_id
       WHERE pr.status = $1
       ORDER BY pr.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, (page - 1) * limit],
    );

    const data = result.rows.map((row: Record<string, unknown>) => row);

    return {
      data: data as unknown as Record<string, unknown>[],
      total,
      page,
      limit,
    };
  }

  async create(data: Partial<PauseRequestEntity>): Promise<PauseRequestEntity> {
    const fields = [
      'request_code',
      'enrollment_id',
      'requested_by',
      'reason',
      'sessions_attended_at_request',
      'status',
    ];
    const cols: string[] = [];
    const vals: unknown[] = [];
    const placeholders: string[] = [];
    let i = 1;

    for (const dKey in data) {
      const dbKey = dKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (fields.includes(dbKey) && (data as any)[dKey] !== undefined) {
        cols.push(dbKey);
        vals.push((data as any)[dKey]);
        placeholders.push(`$${i++}`);
      }
    }

    const query = `INSERT INTO pause_requests (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await this.db.query(query, vals);
    return this.mapToEntity(result.rows[0]);
  }

  async updateStatus(id: string, status: 'approved' | 'rejected', reviewData?: { reviewedBy?: string; reviewNote?: string }): Promise<PauseRequestEntity> {
    const sets = [`status = $1`, `updated_at = NOW()`];
    const vals: any[] = [status];
    let i = 2;

    if (reviewData?.reviewedBy !== undefined) {
      sets.push(`reviewed_by = $${i++}`);
      vals.push(reviewData.reviewedBy);
    }
    if (reviewData?.reviewNote !== undefined) {
      sets.push(`review_note = $${i++}`);
      vals.push(reviewData.reviewNote);
    }

    vals.push(id);
    const query = `UPDATE pause_requests SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`;
    
    const result = await this.db.query(query, vals);
    if (!result.rows[0]) throw new Error('Pause request not found');
    return this.mapToEntity(result.rows[0]);
  }
}

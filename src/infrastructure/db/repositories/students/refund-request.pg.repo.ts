import { IRefundRequestRepo } from '../../../../domain/students/repositories/attendance.repo.port';
import { RefundRequestEntity, RefundRequestStatus } from '../../../../domain/students/entities/refund-request.entity';

export class RefundRequestPgRepo implements IRefundRequestRepo {
  constructor(private readonly db: any) {}

  private mapToEntity(row: any): RefundRequestEntity {
    return new RefundRequestEntity(
      row.id,
      row.request_code,
      row.enrollment_id,
      row.reason_type,
      row.reason_detail,
      parseFloat(row.refund_amount) || 0,
      row.status as RefundRequestStatus,
      row.reviewed_by ?? undefined,
      row.review_note ?? undefined,
      row.created_at,
      row.updated_at,
    );
  }

  async findById(id: string): Promise<RefundRequestEntity | null> {
    const res = await this.db.query(
      `SELECT * FROM refund_requests WHERE id = $1`,
      [id],
    );
    if (!res.rows[0]) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async findByEnrollment(enrollmentId: string): Promise<RefundRequestEntity[]> {
    const res = await this.db.query(
      `SELECT * FROM refund_requests WHERE enrollment_id = $1 ORDER BY created_at DESC`,
      [enrollmentId],
    );
    return res.rows.map((r: any) => this.mapToEntity(r));
  }

  async findAll(
    filter?: { status?: RefundRequestStatus; reasonType?: string },
    paginate?: { page: number; limit: number },
  ): Promise<{ data: RefundRequestEntity[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filter?.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filter.status);
    }
    if (filter?.reasonType) {
      conditions.push(`reason_type = $${idx++}`);
      params.push(filter.reasonType);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count
    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM refund_requests ${where}`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    // Paginated data
    const page = paginate?.page ?? 1;
    const limit = paginate?.limit ?? 20;
    const offset = (page - 1) * limit;

    const dataRes = await this.db.query(
      `SELECT * FROM refund_requests ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    );

    return {
      data: dataRes.rows.map((r: any) => this.mapToEntity(r)),
      total,
    };
  }

  async create(data: Partial<RefundRequestEntity>): Promise<RefundRequestEntity> {
    const res = await this.db.query(
      `INSERT INTO refund_requests
         (request_code, enrollment_id, reason_type, reason_detail, refund_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.requestCode,
        data.enrollmentId,
        data.reasonType,
        data.reasonDetail,
        data.refundAmount ?? 0,
        data.status ?? 'pending',
      ],
    );
    return this.mapToEntity(res.rows[0]);
  }

  async updateStatus(
    id: string,
    status: RefundRequestStatus,
    reviewData?: { reviewedBy?: string; reviewNote?: string },
  ): Promise<void> {
    await this.db.query(
      `UPDATE refund_requests
       SET status      = $1,
           reviewed_by = $2,
           review_note = $3,
           updated_at  = NOW()
       WHERE id = $4`,
      [
        status,
        reviewData?.reviewedBy ?? null,
        reviewData?.reviewNote ?? null,
        id,
      ],
    );
  }
}

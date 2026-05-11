import { IReceiptRepo, ReceiptFilter } from '../../../../domain/finance/repositories/receipt.repo.port';
import { ReceiptEntity, PaymentMethod } from '../../../../domain/finance/entities/receipt.entity';

export class ReceiptPgRepo implements IReceiptRepo {
  constructor(private readonly db: any) {}

  // ── Mapping ──────────────────────────────────────────────────────────────

  private mapToEntity(row: any): ReceiptEntity {
    return new ReceiptEntity(
      row.id,
      row.receipt_code,
      row.payer_name,
      row.payer_address,
      row.student_id,
      row.enrollment_id,
      row.reason,
      Number(row.amount),
      row.amount_in_words,
      row.payment_method as PaymentMethod,
      row.payment_date,
      row.created_by,
      row.payer_signature_name,
      row.note ?? undefined,
      row.voided_by_receipt_id ?? undefined,
      row.transfer_group_id ?? undefined,
      row.created_at,
    );
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async findById(id: string): Promise<ReceiptEntity | null> {
    const res = await this.db.query(
      `SELECT * FROM receipts WHERE id = $1`,
      [id],
    );
    if (!res.rows[0]) return null;
    return this.mapToEntity(res.rows[0]);
  }

  async findByEnrollment(enrollmentId: string): Promise<ReceiptEntity[]> {
    const res = await this.db.query(
      `SELECT * FROM receipts WHERE enrollment_id = $1 ORDER BY payment_date DESC`,
      [enrollmentId],
    );
    return res.rows.map((r: any) => this.mapToEntity(r));
  }

  async findAll(
    filter: ReceiptFilter,
  ): Promise<{ data: ReceiptEntity[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filter.studentId) {
      conditions.push(`student_id = $${idx++}`);
      params.push(filter.studentId);
    }
    if (filter.enrollmentId) {
      conditions.push(`enrollment_id = $${idx++}`);
      params.push(filter.enrollmentId);
    }
    if (filter.dateFrom) {
      conditions.push(`payment_date >= $${idx++}`);
      params.push(filter.dateFrom);
    }
    if (filter.dateTo) {
      conditions.push(`payment_date <= $${idx++}`);
      params.push(filter.dateTo);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM receipts ${where}`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const offset = (filter.page - 1) * filter.limit;
    const dataRes = await this.db.query(
      `SELECT * FROM receipts ${where}
       ORDER BY payment_date DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, filter.limit, offset],
    );

    return {
      data: dataRes.rows.map((r: any) => this.mapToEntity(r)),
      total,
    };
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Tạo phiếu thu mới — KHÔNG có ON CONFLICT, mỗi lần gọi tạo 1 record mới.
   * receiptCode phải là unique và được sinh ở application layer.
   */
  async create(data: Partial<ReceiptEntity>): Promise<ReceiptEntity> {
    const res = await this.db.query(
      `INSERT INTO receipts (
         receipt_code, payer_name, payer_address,
         student_id, enrollment_id, reason,
         amount, amount_in_words, payment_method,
         payment_date, note, created_by,
         payer_signature_name, voided_by_receipt_id, transfer_group_id
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10, $11, $12,
         $13, $14, $15
       )
       RETURNING *`,
      [
        data.receiptCode,
        data.payerName,
        data.payerAddress,
        data.studentId,
        data.enrollmentId,
        data.reason,
        data.amount,
        data.amountInWords,
        data.paymentMethod,
        data.paymentDate ?? new Date(),
        data.note ?? null,
        data.createdBy,
        data.payerSignatureName,
        data.voidedByReceiptId ?? null,
        data.transferGroupId ?? null,
      ],
    );
    return this.mapToEntity(res.rows[0]);
  }
}

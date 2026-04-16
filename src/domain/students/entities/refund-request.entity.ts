export type RefundRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export class RefundRequestEntity {
  constructor(
    public readonly id: string,
    public requestCode: string,
    public readonly enrollmentId: string,
    public reasonType: string,
    public reasonDetail: string,
    public refundAmount: number,
    public status: RefundRequestStatus,
    public reviewedBy?: string,
    public reviewNote?: string,
    public readonly createdAt?: Date,
    public updatedAt?: Date
  ) {}
}

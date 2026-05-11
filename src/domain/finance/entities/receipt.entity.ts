export type PaymentMethod = 'cash' | 'bank_transfer' | 'other';

export class ReceiptEntity {
  constructor(
    public readonly id: string,
    public readonly receiptCode: string,
    public readonly payerName: string,
    public readonly payerAddress: string,
    public readonly studentId: string,
    public readonly enrollmentId: string,
    public readonly reason: string,
    public readonly amount: number,
    public readonly amountInWords: string,
    public readonly paymentMethod: PaymentMethod,
    public readonly paymentDate: Date,
    public readonly createdBy: string,
    public readonly payerSignatureName: string,
    public readonly note?: string,
    /** ID của receipt dùng để void receipt này (bù trừ) */
    public readonly voidedByReceiptId?: string,
    /** Group ID khi nhiều receipts thuộc cùng 1 bulk-transfer */
    public readonly transferGroupId?: string,
    public readonly createdAt?: Date,
  ) {}
}

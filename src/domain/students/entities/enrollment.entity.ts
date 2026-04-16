export type EnrollmentStatus = 'pending' | 'trial' | 'active' | 'paused' | 'transferred' | 'dropped' | 'completed';

export class EnrollmentEntity {
  constructor(
    public readonly id: string,
    public readonly studentId: string,
    public readonly programId: string,
    public readonly classId: string,
    public status: EnrollmentStatus,
    public readonly tuitionFee: number, // IMMUTABLE
    public sessionsAttended: number,
    public sessionsAbsent: number,
    public classTransferCount: number, // max 1
    public makeupBlocked: boolean,
    public enrolledAt: Date,
    public createdAt: Date,
    public updatedAt: Date,
    public paidAt?: Date,
    public createdBy?: string,
  ) {}

  isInFreePeriod(): boolean {
    return this.sessionsAttended < 3;
  }

  canTransferClass(): boolean {
    return this.isInFreePeriod() && this.classTransferCount < 1;
  }

  canPauseDirect(): boolean {
    return this.isInFreePeriod();
  }
}

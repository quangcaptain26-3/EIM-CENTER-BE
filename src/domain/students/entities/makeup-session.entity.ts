export type MakeupSessionStatus = 'pending' | 'completed' | 'cancelled';

export class MakeupSessionEntity {
  constructor(
    public readonly id: string,
    public makeupCode: string,
    public readonly attendanceId: string,
    public readonly enrollmentId: string,
    public makeupDate: Date,
    public shift: 1 | 2,
    public readonly roomId: string,
    public readonly teacherId: string,
    public status: MakeupSessionStatus,
    public readonly createdAt?: Date,
    public updatedAt?: Date
  ) {}
}

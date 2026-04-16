export type AttendanceStatus = 'present' | 'absent_excused' | 'absent_unexcused' | 'late';

export class AttendanceEntity {
  constructor(
    public readonly id: string,
    public readonly sessionId: string,
    public readonly studentId: string,
    public readonly enrollmentId: string,
    public status: AttendanceStatus,
    public note?: string,
    public recordedBy?: string,
    public readonly createdAt?: Date,
    public updatedAt?: Date
  ) {}
}

export class PayrollEntity {
  constructor(
    public readonly id: string,
    public readonly payrollCode: string,
    public readonly teacherId: string,
    public readonly periodMonth: number,
    public readonly periodYear: number,
    public readonly sessionsCount: number,
    /** Snapshot lương/buổi tại thời điểm finalize */
    public readonly salaryPerSessionSnapshot: number,
    /** Snapshot phụ cấp tại thời điểm finalize */
    public readonly allowanceSnapshot: number,
    public readonly totalSalary: number,
    public readonly finalizedBy: string,
    public readonly finalizedAt: Date,
  ) {}
}

export class PayrollSessionDetail {
  constructor(
    public readonly id: string,
    public readonly payrollId: string,
    public readonly sessionId: string,
    public readonly sessionDate: Date,
    public readonly classCode: string,
    /** true nếu giáo viên dạy thay (cover) buổi này */
    public readonly wasCover: boolean,
  ) {}
}

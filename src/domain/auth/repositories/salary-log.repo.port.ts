export interface ISalaryLogRepo {
  create(data: {
    userId: string;
    oldSalaryPerSession: number | null;
    newSalaryPerSession: number | null;
    oldAllowance: number | null;
    newAllowance: number | null;
    changedBy: string;
    reason: string;
  }): Promise<void>;

  getRecentLogs(userId: string, limit: number): Promise<any[]>;
}

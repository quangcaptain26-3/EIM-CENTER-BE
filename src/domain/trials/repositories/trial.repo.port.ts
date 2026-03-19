import { TrialLead, TrialSchedule, TrialConversion, TrialStatus } from "../entities/trial-lead.entity";

export interface TrialListParams {
  search?: string;
  status?: TrialStatus;
  limit?: number;
  offset?: number;
}

export interface TrialCreateParams {
  fullName: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  note?: string | null;
  createdBy?: string | null;
}

export interface TrialUpdateParams {
  fullName?: string;
  phone?: string;
  email?: string | null;
  source?: string | null;
  status?: TrialStatus;
  note?: string | null;
}

export interface TrialRepoPort {
  list(params: TrialListParams): Promise<TrialLead[]>;
  count(params: Omit<TrialListParams, "limit" | "offset">): Promise<number>;
  create(input: TrialCreateParams): Promise<TrialLead>;
  findById(id: string): Promise<TrialLead | null>;
  update(id: string, patch: TrialUpdateParams): Promise<TrialLead>;
  upsertSchedule(trialId: string, classId: string, trialDate: Date): Promise<TrialSchedule>;
  findSchedule(trialId: string): Promise<TrialSchedule | null>;
  createConversion(trialId: string, studentId: string, enrollmentId: string): Promise<TrialConversion>;
}

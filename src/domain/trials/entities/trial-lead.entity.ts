export type TrialStatus = 
  | "NEW"
  | "CONTACTED"
  | "SCHEDULED"
  | "ATTENDED"
  | "NO_SHOW"
  | "CONVERTED"
  | "CLOSED";

export interface TrialLead {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  status: TrialStatus;
  note?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

export interface TrialSchedule {
  id: string;
  trialId: string;
  classId: string;
  trialDate: Date;
  createdAt: Date;
}

export interface TrialConversion {
  id: string;
  trialId: string;
  studentId: string;
  enrollmentId: string;
  convertedAt: Date;
}

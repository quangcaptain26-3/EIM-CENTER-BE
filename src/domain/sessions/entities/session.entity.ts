export class SessionEntity {
  id!: string;
  classId!: string;
  teacherId!: string;
  sessionNo!: number;
  sessionDate!: Date;
  shift!: 1 | 2;
  status!: 'pending' | 'completed' | 'cancelled';
  submittedAt?: Date | string | null;
  submittedBy?: string | null;
  lastEditedAt?: Date | string | null;
  lastEditedBy?: string | null;
  sessionNote?: string;
  originalDate?: Date;
  rescheduleReason?: string;
  rescheduledBy?: string;
  createdAt!: Date;

  constructor(partial: Partial<SessionEntity>) {
    Object.assign(this, partial);
  }
}

export class SessionCoverEntity {
  id!: string;
  sessionId!: string;
  coverTeacherId!: string;
  reason!: string;
  /** Khớp CHECK DB: pending | confirmed | completed | cancelled */
  status!: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'assigned';
  assignedBy!: string;
  createdAt!: Date;

  constructor(partial: Partial<SessionCoverEntity>) {
    Object.assign(this, partial);
  }
}

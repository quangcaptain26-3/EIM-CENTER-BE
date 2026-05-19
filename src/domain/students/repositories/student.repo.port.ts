import { StudentEntity } from '../entities/student.entity';
import { EnrollmentEntity, EnrollmentStatus } from '../entities/enrollment.entity';

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IStudentRepo {
  findById(id: string): Promise<StudentEntity | null>;
  findByCode(code: string): Promise<StudentEntity | null>;
  findAll(params: {
    search?: string;
    programCode?: string;
    programId?: string;
    /** Tên cấp hiển thị (Kindy, Starters…) — map sang programs.code */
    level?: string;
    enrollmentStatus?: string;
    classId?: string;
    isActive?: boolean;
    /** true = không có ghi danh reserved/pending/trial/active/paused (chưa có lớp đang học) */
    withoutActiveEnrollment?: boolean;
    page: number;
    limit: number;
  }): Promise<PagedResult<StudentEntity>>;
  create(data: Partial<StudentEntity>): Promise<StudentEntity>;
  update(id: string, data: Partial<StudentEntity>): Promise<StudentEntity>;
  softDelete(id: string): Promise<void>;
}

/** Roster lớp cho điểm danh — trial + active + paused (đồng bộ filter SQL) */
export interface ClassRosterRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  status: string;
  unexcusedAbsenceCount: number;
  /** Có mặt + muộn (cột enrollments.sessions_attended, trigger từ attendance) */
  sessionsCompleted: number;
  /** Tổng buổi đã tạo trên lớp (sessions) */
  sessionsTotal: number;
}

/** Ghi danh + mã CT / lớp (JOIN) — dùng cho API danh sách */
export interface EnrollmentWithProgramClass {
  enrollment: EnrollmentEntity;
  programCode: string | null;
  programName: string | null;
  classCode: string | null;
}

export interface IEnrollmentRepo {
  findById(id: string): Promise<EnrollmentEntity | null>;
  findByStudent(studentId: string): Promise<EnrollmentEntity[]>;
  /** JOIN programs + classes — hiển thị phiếu thu / danh sách HV */
  findByStudentWithProgramClass(studentId: string): Promise<EnrollmentWithProgramClass[]>;
  findActiveByStudent(studentId: string): Promise<EnrollmentEntity | null>;
  /** Ghi danh đang trong pipeline: reserved, pending, trial, active, paused */
  findPipelineByStudent(studentId: string): Promise<EnrollmentEntity | null>;
  findByClass(classId: string): Promise<EnrollmentEntity[]>;
  findRosterByClass(classId: string): Promise<ClassRosterRow[]>;
  create(data: Partial<EnrollmentEntity>): Promise<EnrollmentEntity>;
  updateStatus(id: string, status: EnrollmentStatus, extraData?: any): Promise<EnrollmentEntity>;
}

export interface HistoryEntry {
  id?: string;
  enrollmentId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromClassId?: string | null;
  toClassId?: string | null;
  fromProgramId?: string | null;
  toProgramId?: string | null;
  sessionsAtAction?: number | null;
  changedBy?: string | null;
  note?: string | null;
  actionDate?: Date;
}

export interface StudentEnrollmentHistoryRow {
  id: string;
  enrollmentId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromClassId?: string | null;
  toClassId?: string | null;
  fromProgramId?: string | null;
  toProgramId?: string | null;
  fromProgramCode?: string | null;
  fromProgramName?: string | null;
  toProgramCode?: string | null;
  toProgramName?: string | null;
  fromClassCode?: string | null;
  toClassCode?: string | null;
  sessionsAtAction?: number | null;
  changedBy?: string | null;
  changedByName?: string | null;
  note?: string | null;
  actionDate?: Date;
}

export interface IEnrollmentHistoryRepo {
  create(data: Partial<HistoryEntry>): Promise<void>;
  findByEnrollment(enrollmentId: string): Promise<HistoryEntry[]>;
  findByStudentId(studentId: string): Promise<StudentEnrollmentHistoryRow[]>;
}

export interface PauseRequestEntity {
  id: string;
  requestCode?: string;
  enrollmentId: string;
  requestedBy?: string;
  sessionsAttendedAtRequest?: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: Date;
  reviewedAt?: Date;
}

export interface IPauseRequestRepo {
  findById(id: string): Promise<PauseRequestEntity | null>;
  findByEnrollment(enrollmentId: string): Promise<PauseRequestEntity[]>;
  /** JOIN học viên / lớp — object phẳng cho API */
  findPagedByStatus(
    status: string,
    page: number,
    limit: number,
  ): Promise<PagedResult<Record<string, unknown>>>;
  create(data: Partial<PauseRequestEntity>): Promise<PauseRequestEntity>;
  updateStatus(id: string, status: 'approved' | 'rejected', reviewData?: { reviewedBy?: string; reviewNote?: string }): Promise<PauseRequestEntity>;
}

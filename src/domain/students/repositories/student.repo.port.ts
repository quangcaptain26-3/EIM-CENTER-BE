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
    page: number;
    limit: number;
  }): Promise<PagedResult<StudentEntity>>;
  create(data: Partial<StudentEntity>): Promise<StudentEntity>;
  update(id: string, data: Partial<StudentEntity>): Promise<StudentEntity>;
  softDelete(id: string): Promise<void>;
}

/** Roster lớp cho điểm danh — chỉ trial + active */
export interface ClassRosterRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  status: string;
  unexcusedAbsenceCount: number;
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

export interface IEnrollmentHistoryRepo {
  create(data: Partial<HistoryEntry>): Promise<void>;
  findByEnrollment(enrollmentId: string): Promise<HistoryEntry[]>;
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
  updatedAt?: Date;
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

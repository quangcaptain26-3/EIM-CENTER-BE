import { AttendanceEntity, AttendanceStatus } from '../entities/attendance.entity';
import { MakeupSessionEntity, MakeupSessionStatus } from '../entities/makeup-session.entity';
import { RefundRequestEntity, RefundRequestStatus } from '../entities/refund-request.entity';

export interface SessionAttendanceDetailRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  status: string | null;
  note: string | null;
}

/** Row gốc từ JOIN attendance + sessions — GET /enrollments/:id/attendance */
export interface AttendanceHistoryJoinRow {
  id: string;
  sessionId: string;
  enrollmentId: string;
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
  sessionNo: number;
  sessionDate: string;
  shift: number;
}

export interface IAttendanceRepo {
  findBySession(sessionId: string): Promise<AttendanceEntity[]>;
  /** JOIN students — dùng cho GET session (pre-fill điểm danh) */
  findDetailRowsBySession(sessionId: string): Promise<SessionAttendanceDetailRow[]>;
  findByEnrollment(enrollmentId: string): Promise<AttendanceEntity[]>;
  /** Lịch sử điểm danh có buổi / ngày / ca */
  findHistoryByEnrollment(enrollmentId: string): Promise<AttendanceHistoryJoinRow[]>;
  findById(id: string): Promise<AttendanceEntity | null>;
  upsert(data: {
    sessionId: string;
    studentId: string;
    enrollmentId: string;
    status: AttendanceStatus;
    note?: string;
    recordedBy?: string;
  }): Promise<AttendanceEntity>;
}

export interface IMakeupSessionRepo {
  findById(id: string): Promise<MakeupSessionEntity | null>;
  findByEnrollment(enrollmentId: string): Promise<MakeupSessionEntity[]>;
  findByAttendance(attendanceId: string): Promise<MakeupSessionEntity | null>;
  create(data: Partial<MakeupSessionEntity>): Promise<MakeupSessionEntity>;
  updateStatus(id: string, status: MakeupSessionStatus): Promise<void>;
}

export interface IRefundRequestRepo {
  findById(id: string): Promise<RefundRequestEntity | null>;
  findByEnrollment(enrollmentId: string): Promise<RefundRequestEntity[]>;
  findAll(filter?: { status?: RefundRequestStatus; reasonType?: string }, paginate?: { page: number; limit: number }): Promise<{ data: RefundRequestEntity[], total: number }>;
  create(data: Partial<RefundRequestEntity>): Promise<RefundRequestEntity>;
  updateStatus(id: string, status: RefundRequestStatus, reviewData?: { reviewedBy?: string; reviewNote?: string }): Promise<void>;
}

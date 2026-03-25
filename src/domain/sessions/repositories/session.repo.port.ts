// src/domain/sessions/repositories/session.repo.port.ts
import { Session, SessionStatus, SessionType } from "../entities/session.entity";

export interface CreateSessionInput {
  classId: string;
  sessionDate: Date;
  unitNo: number;
  lessonNo: number;
  lessonPattern?: string | null;
  sessionType: SessionType;
  mainTeacherId?: string | null;
  coverTeacherId?: string | null;
}

export interface UpdateSessionInput {
  sessionStatus?: SessionStatus;
  unitNo?: number;
  lessonNo?: number;
  lessonPattern?: string | null;
  sessionType?: SessionType;
  mainTeacherId?: string | null;
  coverTeacherId?: string | null;
}

export interface ISessionRepository {
  /** Tạo nhiều buổi học */
  createMany(inputs: CreateSessionInput[]): Promise<Session[]>;
  /** Lấy danh sách buổi học của một lớp */
  listByClass(classId: string): Promise<Session[]>;
  /** Lấy danh sách buổi học của một lớp theo khoảng ngày (lọc ở DB) */
  listByClassInRange(
    classId: string,
    params?: { fromDate?: Date; toDate?: Date; limit?: number },
  ): Promise<Session[]>;
  /** Tìm buổi học theo ID */
  findById(sessionId: string): Promise<Session | null>;
  /** Lấy danh sách buổi học của một giáo viên (dạy chính hoặc dạy thay) */
  listByTeacher(teacherId: string): Promise<Session[]>;
  /** Cập nhật thông tin buổi học */
  update(sessionId: string, patch: UpdateSessionInput): Promise<Session>;
  /** Đổi lịch buổi học */
  reschedule(sessionId: string, toDate: Date, note?: string, changedBy?: string): Promise<Session>;
  /** Kiểm tra xem ngày đó lớp đã có buổi học chưa */
  existsByClassAndDate(classId: string, date: Date): Promise<boolean>;
  /** Xóa toàn bộ buổi học của một lớp (dùng khi replace generate). Trả về số dòng đã xóa. */
  deleteByClassId(classId: string): Promise<number>;
  /**
   * Cập nhật main_teacher_id cho các buổi có session_date >= fromDate.
   * Dùng cho đổi giáo viên dài hạn (từ ngày X trở đi).
   * Trả về số buổi đã cập nhật.
   */
  updateMainTeacherForSessionsFromDate(
    classId: string,
    fromDate: Date,
    mainTeacherId: string | null
  ): Promise<number>;
}

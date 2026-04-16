import { SessionEntity, SessionCoverEntity } from '../entities/session.entity';

/** Pool hoặc PoolClient — truyền vào khi thực thi trong transaction */
export type SessionDbExecutor = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
};

export interface ISessionRepo {
  findById(id: string): Promise<SessionEntity | null>;
  findByClass(classId: string): Promise<SessionEntity[]>;
  findByTeacher(teacherId: string, month: number, year: number): Promise<SessionEntity[]>;
  bulkCreate(sessions: Partial<SessionEntity>[]): Promise<SessionEntity[]>;
  update(id: string, data: Partial<{
    sessionDate: Date;
    status: 'pending' | 'completed' | 'cancelled';
    sessionNote: string;
    rescheduleReason: string;
    rescheduledBy: string;
    originalDate: Date;
  }>): Promise<SessionEntity>;

  /**
   * Buổi học thứ 24 của lớp gắn với enrollment (khóa học).
   * Dùng validate ngày học bù phải trước buổi cuối khóa.
   */
  findLastSessionOfEnrollment(enrollmentId: string): Promise<SessionEntity | null>;

  /** MIN(session_no) trong lớp cho buổi còn pending; null nếu không có dòng pending */
  getFirstPendingSessionNo(classId: string, executor?: SessionDbExecutor): Promise<number | null>;

  /** Gán teacher_id mới cho mọi buổi pending từ fromSessionNo trở đi */
  updateTeacherFromSession(
    classId: string,
    fromSessionNo: number,
    newTeacherId: string,
    executor?: SessionDbExecutor,
  ): Promise<void>;
}

export interface ISessionCoverRepo {
  findBySession(sessionId: string): Promise<SessionCoverEntity | null>;
  findAvailableTeachers(sessionId: string): Promise<any[]>;
  findCoversByTeacher(teacherId: string, month: number, year: number): Promise<any[]>;
  create(data: Partial<SessionCoverEntity>): Promise<SessionCoverEntity>;
  updateStatus(sessionId: string, status: string): Promise<boolean>;
}

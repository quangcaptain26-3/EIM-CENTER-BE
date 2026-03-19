import { AppError } from '../../../shared/errors/app-error';
import { teacherCanWriteSession } from './teacher-ownership.rule';

export type FeedbackActor = {
  userId: string;
  roles: string[];
};

export type SessionOwnershipShape = {
  id: string;
  sessionType: string;
  mainTeacherId?: string | null;
  coverTeacherId?: string | null;
};

/**
 * Policy tập trung cho module feedback/score.
 * Mục tiêu: không rải permission check ở controller/usecase lộn xộn.
 */
export class FeedbackPolicy {
  /**
   * Teacher chỉ được ghi feedback/score/import cho session mình dạy hoặc cover.
   * Theo design "manager read-only": các role quản lý chỉ được xem, không được ghi thay giáo viên.
   */
  static assertCanWriteSession(session: SessionOwnershipShape, actor: FeedbackActor): void {
    const isTeacher = actor.roles.includes('TEACHER');
    if (!isTeacher) {
      throw AppError.forbidden('Chế độ Xem: Quản lý không thể ghi nhận xét/điểm thay giáo viên', {
        code: 'FEEDBACK_POLICY/MANAGER_READONLY',
        sessionId: session.id,
        actorId: actor.userId,
        actorRoles: actor.roles,
      });
    }

    const canWrite = teacherCanWriteSession(session, actor.userId);
    if (!canWrite) {
      throw AppError.forbidden('Giáo viên không có quyền cập nhật nhận xét/điểm cho buổi học này', {
        code: 'FEEDBACK_POLICY/TEACHER_NOT_OWNER',
        sessionId: session.id,
        actorId: actor.userId,
      });
    }
  }

  /**
   * Export theo class/date có thể bao gồm nhiều session.
   * Policy: TEACHER chỉ được export các session mà mình dạy/cover.
   * Nếu filter chỉ định 1 sessionId thì yêu cầu ownership strict.
   */
  static filterSessionsCanExport(
    sessions: SessionOwnershipShape[],
    actor: FeedbackActor,
  ): SessionOwnershipShape[] {
    const isTeacher = actor.roles.includes('TEACHER');
    if (!isTeacher) {
      return sessions;
    }
    return sessions.filter((s) => teacherCanWriteSession(s, actor.userId));
  }
}


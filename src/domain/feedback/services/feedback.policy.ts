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
   * R7 Manager override: ACADEMIC/ROOT được ghi feedback/điểm bất kỳ session (bỏ qua ownership + deadline).
   * Teacher: chỉ được ghi session mình dạy/cover, và phải trong cửa sổ chỉnh sửa (rule riêng).
   */
  static assertCanWriteSession(session: SessionOwnershipShape, actor: FeedbackActor): void {
    const isManagerOverride = actor.roles.includes('ACADEMIC') || actor.roles.includes('ROOT');
    if (isManagerOverride) {
      return;
    }

    const isTeacher = actor.roles.includes('TEACHER');
    if (!isTeacher) {
      throw AppError.forbidden('Chế độ Xem: Không có quyền ghi nhận xét/điểm', {
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


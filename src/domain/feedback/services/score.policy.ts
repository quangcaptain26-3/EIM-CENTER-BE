import { AppError } from '../../../shared/errors/app-error';
import { ScoreType } from '../entities/session-score.entity';

/**
 * Teacher chỉ xem điểm của lớp mình: được enforce qua FeedbackPolicy.filterSessionsCanExport
 * và enforceTeacherOwnsSession/CanReadSession trên các route feedback/scores.
 */

export type BackendSessionType = 'NORMAL' | 'TEST' | 'MIDTERM' | 'FINAL';

export type NormalizedScoreInput = {
  scoreType: ScoreType;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  total: number | null;
  note: string | null;
};

export class ScorePolicy {
  static assertSessionTypeAllowsScore(sessionType: BackendSessionType): void {
    if (sessionType === 'NORMAL') {
      throw AppError.badRequest('Không thể chấm điểm (TEST/MIDTERM/FINAL) cho buổi học loại NORMAL', {
        code: 'SCORE_POLICY/SCORE_NOT_ALLOWED_FOR_NORMAL',
        sessionType,
      });
    }
  }

  static getAllowedScoreTypeForSession(sessionType: BackendSessionType): ScoreType {
    if (sessionType === 'MIDTERM' || sessionType === 'FINAL') {
      return sessionType;
    }
    // TEST (tương ứng QUIZ trong Excel)
    return 'TEST';
  }

  /**
   * Chuẩn hóa payload điểm:
   * - Giữ nguyên note
   * - total: nếu null và có kỹ năng -> tự tính trung bình (làm tròn số nguyên)
   * - total: nếu có nhưng không hợp lệ -> báo lỗi
   */
  static normalizeScore(input: NormalizedScoreInput): NormalizedScoreInput {
    const skills = [input.listening, input.reading, input.writing, input.speaking].filter(
      (v): v is number => v !== null,
    );

    // Không có kỹ năng nào thì total cũng nên null (tránh lưu total rời rạc)
    if (skills.length === 0) {
      if (input.total !== null) {
        throw AppError.badRequest('Không hợp lệ: không có điểm kỹ năng nhưng lại có score_total', {
          code: 'SCORE_VALIDATION/TOTAL_WITHOUT_SKILLS',
        });
      }
      return input;
    }

    if (input.total === null) {
      const sum = skills.reduce((acc, v) => acc + v, 0);
      const avg = Math.round(sum / skills.length);
      return { ...input, total: avg };
    }

    return input;
  }
}


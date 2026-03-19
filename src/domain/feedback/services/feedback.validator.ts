import { AppError } from '../../../shared/errors/app-error';
import {
  ATTENDANCE_EXCEL_VALUES,
  HOMEWORK_EXCEL_VALUES,
  AttendanceExcelValue,
  HomeworkExcelValue,
  FeedbackMetricExcelValue,
} from '../../../infrastructure/excel/feedback-excel.contract';

export type FeedbackUpsertInput = {
  studentId: string;
  attendance: string | null | undefined;
  homework: string | null | undefined;
  participation: string | number | null | undefined;
  behavior: string | number | null | undefined;
  languageUsage: string | number | null | undefined;
  comment: string | null | undefined;
};

export type NormalizedFeedbackValues = {
  attendance: AttendanceExcelValue | null;
  homework: HomeworkExcelValue | null;
  /**
   * Lưu ý: DB hiện lưu các metric dưới dạng TEXT.
   * Vì vậy ta chuẩn hóa về chuỗi "1".."5" để:
   * - giữ tương thích schema hiện tại
   * - vẫn validate nghiêm ngặt theo rule 1..5
   */
  participation: string | null;
  behavior: string | null;
  languageUsage: string | null;
  commentText: string | null;
};

export class FeedbackValidator {
  static normalizeValues(input: FeedbackUpsertInput): NormalizedFeedbackValues {
    const attendance = this.parseEnum(
      input.attendance,
      ATTENDANCE_EXCEL_VALUES,
      'attendance',
      'Giá trị attendance không hợp lệ',
      'FEEDBACK_VALIDATION/INVALID_ATTENDANCE',
    );

    const homework = this.parseEnum(
      input.homework,
      HOMEWORK_EXCEL_VALUES,
      'homework',
      'Giá trị homework không hợp lệ',
      'FEEDBACK_VALIDATION/INVALID_HOMEWORK',
    );

    const participation = this.parseMetric(input.participation, 'participation');
    const behavior = this.parseMetric(input.behavior, 'behavior');
    const languageUsage = this.parseMetric(input.languageUsage, 'languageUsage');

    const commentText = input.comment ?? null;

    return { attendance, homework, participation, behavior, languageUsage, commentText };
  }

  private static parseEnum<T extends string>(
    raw: string | null | undefined,
    allowed: readonly T[],
    field: string,
    message: string,
    detailsCode: string,
  ): T | null {
    if (raw === undefined || raw === null || raw === '') {
      return null;
    }
    if (!allowed.includes(raw as T)) {
      throw AppError.badRequest(message, { code: detailsCode, field, value: raw });
    }
    return raw as T;
  }

  private static parseMetric(
    raw: string | number | null | undefined,
    field: string,
  ): string | null {
    if (raw === undefined || raw === null || raw === '') {
      return null;
    }
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(num) || num < 1 || num > 5) {
      throw AppError.badRequest('Giá trị metric phải là số nguyên từ 1 đến 5', {
        code: 'FEEDBACK_VALIDATION/INVALID_METRIC',
        field,
        value: raw,
      });
    }
    return String(num);
  }
}


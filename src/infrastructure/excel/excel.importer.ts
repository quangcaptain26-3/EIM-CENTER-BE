import * as ExcelJS from 'exceljs';
import {
  FEEDBACK_EXCEL_SHEET_NAME,
  FEEDBACK_EXCEL_COLUMNS,
  FEEDBACK_HEADERS_VI,
  REQUIRED_FEEDBACK_EXCEL_COLUMNS,
  ATTENDANCE_EXCEL_VALUES,
  HOMEWORK_EXCEL_VALUES,
  SESSION_TYPE_EXCEL_VALUES,
  FeedbackExcelColumnKey,
  DraftFeedbackImportRow,
  ImportRowError,
  ImportErrorCode,
  SessionFeedbackExcelRow,
  FeedbackMetricExcelValue,
} from './feedback-excel.contract';

/**
 * Kiểu dữ liệu cũ phục vụ cho usecase import hiện tại.
 * Sẽ dần được thay thế bằng bộ types chuẩn trong feedback-excel.contract.
 */
export interface ImportFeedbackRow {
  studentId: string;
  attendance?: string;
  homework?: string;
  participation?: string;
  behavior?: string;
  comment?: string;
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  data: ImportFeedbackRow[];
  errors: ImportError[];
}

/**
 * Kết quả parser mới dành cho luồng import Excel:
 * - drafts: toàn bộ các dòng đã parse (ké cả dòng lỗi, với parsed = null).
 * - rowErrors: lỗi mức từng dòng.
 * - globalErrors: lỗi mức file/header/sheet.
 */
export interface FeedbackExcelParseResult {
  drafts: DraftFeedbackImportRow[];
  rowErrors: ImportRowError[];
  globalErrors: ImportRowError[];
}

export class FeedbackImporter {
  // Giới hạn để tránh import quá nặng (DoS/memory) và giảm lỗi UX khi file quá lớn.
  // Con số này nên được review theo sĩ số lớp/thực tế vận hành.
  private readonly MAX_DATA_ROWS = 1000; // không tính header (row 1)

  /**
   * API mới: parse file Excel về cấu trúc DraftFeedbackImportRow + lỗi parse cơ bản.
   * Không chạm tới business rule (roster, ownership, session type cho phép điểm...).
   */
  async parseSessionFeedbackDraft(buffer: Buffer): Promise<FeedbackExcelParseResult> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      return {
        drafts: [],
        rowErrors: [],
        globalErrors: [
          this.buildGlobalError('EMPTY_FILE', 'Định dạng file không hợp lệ hoặc không thể đọc file Excel'),
        ],
      };
    }

    // Sheet name enforcement:
    // - Ưu tiên đúng sheet "SessionFeedback".
    // - Chỉ fallback sang sheet đầu tiên khi workbook có đúng 1 sheet (tránh import nhầm sheet).
    const targetSheet = workbook.getWorksheet(FEEDBACK_EXCEL_SHEET_NAME);
    const sheet =
      targetSheet ??
      (workbook.worksheets.length === 1 ? workbook.worksheets[0] : undefined);

    if (!sheet) {
      return {
        drafts: [],
        rowErrors: [],
        globalErrors: [
          this.buildGlobalError(
            'INVALID_HEADER',
            `Không tìm thấy sheet "${FEEDBACK_EXCEL_SHEET_NAME}" trong file Excel`,
          ),
        ],
      };
    }

    if (sheet.rowCount === 0) {
      return {
        drafts: [],
        rowErrors: [],
        globalErrors: [
          this.buildGlobalError('EMPTY_FILE', `Sheet "${FEEDBACK_EXCEL_SHEET_NAME}" rỗng hoặc không có dữ liệu`),
        ],
      };
    }

    // Chặn file quá lớn để tránh parse lâu và tốn RAM (đặc biệt khi dùng memoryStorage).
    // sheet.rowCount bao gồm header, nên số dòng data = rowCount - 1.
    const dataRowCount = Math.max(0, sheet.rowCount - 1);
    if (dataRowCount > this.MAX_DATA_ROWS) {
      return {
        drafts: [],
        rowErrors: [],
        globalErrors: [
          this.buildGlobalError(
            "ROW_LIMIT_EXCEEDED",
            `File có ${dataRowCount} dòng dữ liệu, vượt giới hạn cho phép (${this.MAX_DATA_ROWS}). Vui lòng chia nhỏ file và import lại.`,
          ),
        ],
      };
    }

    const headerRow = sheet.getRow(1);
    const headerMap = this.buildHeaderMap(headerRow);

    const globalErrors: ImportRowError[] = [];

    // Kiểm tra thiếu header bắt buộc
    const missingRequired = REQUIRED_FEEDBACK_EXCEL_COLUMNS.filter(
      (key) => !headerMap.has(key),
    );
    if (missingRequired.length > 0) {
      missingRequired.forEach((key) => {
        globalErrors.push({
          rowIndex: 1,
          columnKey: key,
          code: 'MISSING_REQUIRED_COLUMN',
          message: `Thiếu cột bắt buộc: ${key}`,
        });
      });
    }

    const drafts: DraftFeedbackImportRow[] = [];
    const rowErrors: ImportRowError[] = [];

    for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
      const row = sheet.getRow(rowIndex);
      const raw = this.readRawRow(row, headerMap);

      // Bỏ qua dòng hoàn toàn rỗng
      if (this.isRowCompletelyEmpty(raw)) {
        continue;
      }

      const parseResult = this.parseRow(rowIndex, raw);
      drafts.push(parseResult.draft);
      rowErrors.push(...parseResult.errors);
    }

    return {
      drafts,
      rowErrors,
      globalErrors,
    };
  }

  /**
   * Hàm cũ phục vụ usecase import hiện tại.
   * Được refactor để sử dụng parser mới, tránh duplicate logic.
   * Sau này có thể xoá khi usecase chuyển hẳn sang types mới.
   */
  async parseSessionFeedback(buffer: Buffer): Promise<ImportResult> {
    const { drafts, rowErrors, globalErrors } = await this.parseSessionFeedbackDraft(buffer);

    const data: ImportFeedbackRow[] = drafts
      .filter((d) => d.parsed !== null)
      .map((d) => {
        const parsed = d.parsed as SessionFeedbackExcelRow;
        return {
          studentId: parsed.studentId,
          attendance: parsed.attendance ?? undefined,
          homework: parsed.homework ?? undefined,
          participation: parsed.participation !== null ? String(parsed.participation) : undefined,
          behavior: parsed.behavior !== null ? String(parsed.behavior) : undefined,
          comment: parsed.comment ?? undefined,
        };
      });

    const errors: ImportError[] = [...globalErrors, ...rowErrors].map((err) => ({
      row: err.rowIndex,
      message: err.message,
    }));

    return { data, errors };
  }

  /**
   * Xây dựng map header -> index cột từ dòng header đầu tiên.
   * Chấp nhận cả key tiếng Anh và header tiếng Việt (FEEDBACK_HEADERS_VI).
   */
  private buildHeaderMap(
    headerRow: ExcelJS.Row,
  ): Map<FeedbackExcelColumnKey, number> {
    const map = new Map<FeedbackExcelColumnKey, number>();
    const viToKey = new Map<string, FeedbackExcelColumnKey>();
    (FEEDBACK_EXCEL_COLUMNS as readonly string[]).forEach((k) => {
      viToKey.set(FEEDBACK_HEADERS_VI[k as FeedbackExcelColumnKey], k as FeedbackExcelColumnKey);
    });

    headerRow.eachCell((cell, colNumber) => {
      const rawHeader = (cell.text || '').trim();
      if (!rawHeader) return;

      if (FEEDBACK_EXCEL_COLUMNS.includes(rawHeader as FeedbackExcelColumnKey)) {
        map.set(rawHeader as FeedbackExcelColumnKey, colNumber);
      } else if (viToKey.has(rawHeader)) {
        map.set(viToKey.get(rawHeader)!, colNumber);
      }
    });

    return map;
  }

  /**
   * Đọc thô toàn bộ giá trị text của row theo header map.
   */
  private readRawRow(
    row: ExcelJS.Row,
    headerMap: Map<FeedbackExcelColumnKey, number>,
  ): Partial<Record<FeedbackExcelColumnKey, string>> {
    const raw: Partial<Record<FeedbackExcelColumnKey, string>> = {};

    headerMap.forEach((colIndex, key) => {
      const cell = row.getCell(colIndex);
      const text = (cell.text ?? '').trim();
      if (text !== '') {
        raw[key] = text;
      }
    });

    return raw;
  }

  private isRowCompletelyEmpty(
    raw: Partial<Record<FeedbackExcelColumnKey, string>>,
  ): boolean {
    return Object.keys(raw).length === 0;
  }

  /**
   * Parse một row về SessionFeedbackExcelRow + tập lỗi parse cơ bản.
   * Không kiểm tra business rule sâu, chỉ parse kiểu dữ liệu, enum/range cơ bản.
   */
  private parseRow(
    rowIndex: number,
    raw: Partial<Record<FeedbackExcelColumnKey, string>>,
  ): { draft: DraftFeedbackImportRow; errors: ImportRowError[] } {
    const errors: ImportRowError[] = [];

    const sessionId = raw.session_id ?? '';
    const studentId = raw.student_id ?? '';

    if (!sessionId) {
      errors.push(this.buildRowError(rowIndex, 'session_id', 'INVALID_SESSION_ID', 'Thiếu session_id', raw.session_id));
    }

    if (!studentId) {
      errors.push(
        this.buildRowError(rowIndex, 'student_id', 'INVALID_STUDENT_ID', 'Thiếu student_id', raw.student_id),
      );
    }

    const sessionDateStr = raw.session_date ?? '';
    let sessionDate: Date | null = null;
    if (sessionDateStr) {
      const parsedDate = this.parseFlexibleDate(sessionDateStr);
      if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
        errors.push(
          this.buildRowError(
            rowIndex,
            'session_date',
            'ROW_PARSE_ERROR',
            'Giá trị session_date không hợp lệ',
            sessionDateStr,
          ),
        );
      } else {
        sessionDate = parsedDate;
      }
    } else {
      errors.push(
        this.buildRowError(
          rowIndex,
          'session_date',
          'ROW_PARSE_ERROR',
          'Thiếu session_date',
          sessionDateStr,
        ),
      );
    }

    const sessionTypeStr = raw.session_type ?? '';
    if (!sessionTypeStr) {
      errors.push(
        this.buildRowError(
          rowIndex,
          'session_type',
          'ROW_PARSE_ERROR',
          'Thiếu session_type',
          sessionTypeStr,
        ),
      );
    }
    if (sessionTypeStr && !this.isSessionTypeExcelValue(sessionTypeStr)) {
      errors.push(
        this.buildRowError(
          rowIndex,
          'session_type',
          'ROW_PARSE_ERROR',
          'Giá trị session_type không hợp lệ',
          sessionTypeStr,
        ),
      );
    }

    const attendance = this.parseEnumCell(
      rowIndex,
      'attendance',
      raw.attendance,
      ATTENDANCE_EXCEL_VALUES,
      'INVALID_ATTENDANCE',
      'Giá trị attendance không hợp lệ',
      errors,
    );

    const homework = this.parseEnumCell(
      rowIndex,
      'homework',
      raw.homework,
      HOMEWORK_EXCEL_VALUES,
      'INVALID_HOMEWORK',
      'Giá trị homework không hợp lệ',
      errors,
    );

    const participation = this.parseMetricCell(
      rowIndex,
      'participation',
      raw.participation,
      errors,
    );
    const behavior = this.parseMetricCell(
      rowIndex,
      'behavior',
      raw.behavior,
      errors,
    );
    const languageUsage = this.parseMetricCell(
      rowIndex,
      'language_usage',
      raw.language_usage,
      errors,
    );

    const scoreListening = this.parseScoreCell(
      rowIndex,
      'score_listening',
      raw.score_listening,
      errors,
    );
    const scoreReading = this.parseScoreCell(
      rowIndex,
      'score_reading',
      raw.score_reading,
      errors,
    );
    const scoreWriting = this.parseScoreCell(
      rowIndex,
      'score_writing',
      raw.score_writing,
      errors,
    );
    const scoreSpeaking = this.parseScoreCell(
      rowIndex,
      'score_speaking',
      raw.score_speaking,
      errors,
    );
    const scoreTotal = this.parseScoreCell(
      rowIndex,
      'score_total',
      raw.score_total,
      errors,
    );

    const comment = raw.comment ?? null;
    const scoreNote = raw.score_note ?? null;
    const classCode = raw.class_code ?? '';
    const studentName = raw.student_name ?? '';

    let parsed: SessionFeedbackExcelRow | null = null;
    if (errors.length === 0) {
      parsed = {
        sessionId,
        sessionDate: sessionDate as Date,
        sessionType: sessionTypeStr as any,
        classCode,
        studentId,
        studentName,
        attendance: attendance ?? null,
        homework: homework ?? null,
        participation,
        behavior,
        languageUsage,
        comment,
        scoreListening,
        scoreReading,
        scoreWriting,
        scoreSpeaking,
        scoreTotal,
        scoreNote,
      };
    }

    const draft: DraftFeedbackImportRow = {
      rowIndex,
      raw,
      parsed,
    };

    return { draft, errors };
  }

  /**
   * Parse ngày từ Excel hỗ trợ YYYY-MM-DD và DD/MM/YYYY.
   */
  private parseFlexibleDate(str: string): Date | null {
    const s = str.trim();
    if (!s) return null;

    // DD/MM/YYYY
    const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      // month 0-based
      const d = new Date(parseInt(year!, 10), parseInt(month!, 10) - 1, parseInt(day!, 10));
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const parsed = new Date(s);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseEnumCell<T extends string>(
    rowIndex: number,
    columnKey: FeedbackExcelColumnKey,
    rawValue: string | undefined,
    allowed: readonly T[],
    code: ImportErrorCode,
    message: string,
    errors: ImportRowError[],
  ): T | null {
    if (!rawValue) {
      return null;
    }

    if (!allowed.includes(rawValue as T)) {
      errors.push(
        this.buildRowError(rowIndex, columnKey, code, message, rawValue),
      );
      return null;
    }

    return rawValue as T;
  }

  private parseMetricCell(
    rowIndex: number,
    columnKey: FeedbackExcelColumnKey,
    rawValue: string | undefined,
    errors: ImportRowError[],
  ): FeedbackMetricExcelValue | null {
    if (!rawValue) {
      return null;
    }

    const num = Number(rawValue);
    if (!Number.isInteger(num) || num < 1 || num > 5) {
      errors.push(
        this.buildRowError(
          rowIndex,
          columnKey,
          'INVALID_FEEDBACK_METRIC',
          'Giá trị metric phải là số nguyên từ 1 đến 5',
          rawValue,
        ),
      );
      return null;
    }

    return num as FeedbackMetricExcelValue;
  }

  private parseScoreCell(
    rowIndex: number,
    columnKey: FeedbackExcelColumnKey,
    rawValue: string | undefined,
    errors: ImportRowError[],
  ): number | null {
    if (!rawValue) {
      return null;
    }

    const num = Number(rawValue);
    if (!Number.isInteger(num) || num < 0 || num > 100) {
      errors.push(
        this.buildRowError(
          rowIndex,
          columnKey,
          'INVALID_SCORE_VALUE',
          'Giá trị điểm phải là số nguyên từ 0 đến 100',
          rawValue,
        ),
      );
      return null;
    }

    return num;
  }

  private isSessionTypeExcelValue(value: string): value is (typeof SESSION_TYPE_EXCEL_VALUES)[number] {
    return (SESSION_TYPE_EXCEL_VALUES as readonly string[]).includes(value);
  }

  private buildRowError(
    rowIndex: number,
    columnKey: FeedbackExcelColumnKey,
    code: ImportErrorCode,
    message: string,
    value?: string,
  ): ImportRowError {
    return {
      rowIndex,
      columnKey,
      code,
      message,
      value,
    };
  }

  private buildGlobalError(
    code: ImportErrorCode,
    message: string,
  ): ImportRowError {
    return {
      // Dùng 1-based row index để đồng bộ cách FE hiển thị bảng lỗi.
      rowIndex: 1,
      code,
      message,
    };
  }
}


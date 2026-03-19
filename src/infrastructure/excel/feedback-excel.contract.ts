/**
 * Canonical Excel contract for Session Feedback import / template.
 *
 * This file only contains shared types and constants.
 * Importer / Exporter / UseCases will depend on these definitions
 * so that FE & BE stay aligned on the same column names and rules.
 */

// =========================
// Sheet & Column Definitions
// =========================

export const FEEDBACK_EXCEL_SHEET_NAME = 'SessionFeedback' as const;

/**
 * Canonical ordered list of column headers for feedback Excel.
 * This order is used when generating templates / reports.
 */
export const FEEDBACK_EXCEL_COLUMNS = [
  'session_id',
  'session_date',
  'session_type',
  'class_code',
  'student_id',
  'student_name',
  'attendance',
  'homework',
  'participation',
  'behavior',
  'language_usage',
  'comment',
  'score_listening',
  'score_reading',
  'score_writing',
  'score_speaking',
  'score_total',
  'score_note',
] as const;

export type FeedbackExcelColumnKey = (typeof FEEDBACK_EXCEL_COLUMNS)[number];

// =========================
// Column Groups
// =========================

/**
 * Columns that must be present in the header row
 * for a file to be considered a valid feedback template.
 */
export const REQUIRED_FEEDBACK_EXCEL_COLUMNS: readonly FeedbackExcelColumnKey[] = [
  'session_id',
  'session_date',
  'session_type',
  'class_code',
  'student_id',
  'student_name',
] as const;

/**
 * Columns that are considered read-only for end users.
 * Importer should never trust edits on these columns and
 * must always validate them against server-side data.
 */
export const READONLY_FEEDBACK_EXCEL_COLUMNS: readonly FeedbackExcelColumnKey[] = [
  'session_id',
  'session_date',
  'session_type',
  'class_code',
  'student_id',
  'student_name',
] as const;

/**
 * Columns that are meant to be edited by teachers.
 * Importer will read values from these columns to update feedback / scores.
 */
export const EDITABLE_FEEDBACK_EXCEL_COLUMNS: readonly FeedbackExcelColumnKey[] = [
  'attendance',
  'homework',
  'participation',
  'behavior',
  'language_usage',
  'comment',
  'score_listening',
  'score_reading',
  'score_writing',
  'score_speaking',
  'score_total',
  'score_note',
] as const;

export const FEEDBACK_VALUE_COLUMNS: readonly FeedbackExcelColumnKey[] = [
  'attendance',
  'homework',
  'participation',
  'behavior',
  'language_usage',
  'comment',
] as const;

export const SCORE_VALUE_COLUMNS: readonly FeedbackExcelColumnKey[] = [
  'score_listening',
  'score_reading',
  'score_writing',
  'score_speaking',
  'score_total',
  'score_note',
] as const;

export const FEEDBACK_METRIC_COLUMNS = [
  'participation',
  'behavior',
  'language_usage',
] as const satisfies readonly FeedbackExcelColumnKey[];

export const SCORE_METRIC_COLUMNS = [
  'score_listening',
  'score_reading',
  'score_writing',
  'score_speaking',
] as const satisfies readonly FeedbackExcelColumnKey[];

// =========================
// Helper value enums
// =========================

export const ATTENDANCE_EXCEL_VALUES = ['PRESENT', 'ABSENT', 'LATE'] as const;
export type AttendanceExcelValue = (typeof ATTENDANCE_EXCEL_VALUES)[number];

export const HOMEWORK_EXCEL_VALUES = ['DONE', 'NOT_DONE'] as const;
export type HomeworkExcelValue = (typeof HOMEWORK_EXCEL_VALUES)[number];

export const SESSION_TYPE_EXCEL_VALUES = ['NORMAL', 'QUIZ', 'MIDTERM', 'FINAL'] as const;
export type SessionTypeExcelValue = (typeof SESSION_TYPE_EXCEL_VALUES)[number];

/**
 * Feedback metrics are 1–5 inclusive.
 * Raw values from Excel will be coerced and validated
 * before being mapped into this union.
 */
export type FeedbackMetricExcelValue = 1 | 2 | 3 | 4 | 5;

/**
 * Score value range is 0–100.
 * We keep it as number here; importer is responsible
 * for parsing and validating incoming cell values.
 */
export type ScoreExcelValue = number;

export const SCORE_FIELD_KEYS = SCORE_METRIC_COLUMNS;
export const FEEDBACK_METRIC_FIELD_KEYS = FEEDBACK_METRIC_COLUMNS;

// =========================
// Parsed Row Types
// =========================

/**
 * Strongly-typed representation of a single Excel row
 * after parsing and basic validation.
 *
 * This structure is what UseCases should consume in order
 * to upsert feedback and scores.
 */
export interface SessionFeedbackExcelRow {
  // Keys / context (must always be present and already validated)
  sessionId: string;
  sessionDate: Date;
  sessionType: SessionTypeExcelValue;
  classCode: string;
  studentId: string;
  studentName: string;

  // Feedback fields (optional – may be null when not provided)
  attendance: AttendanceExcelValue | null;
  homework: HomeworkExcelValue | null;
  participation: FeedbackMetricExcelValue | null;
  behavior: FeedbackMetricExcelValue | null;
  languageUsage: FeedbackMetricExcelValue | null;
  comment: string | null;

  // Score fields (only meaningful when sessionType is QUIZ/MIDTERM/FINAL)
  scoreListening: ScoreExcelValue | null;
  scoreReading: ScoreExcelValue | null;
  scoreWriting: ScoreExcelValue | null;
  scoreSpeaking: ScoreExcelValue | null;
  scoreTotal: ScoreExcelValue | null;
  scoreNote: string | null;
}

/**
 * Intermediate structure used by importer:
 * - Keeps a reference to the original row index
 * - Holds raw cell texts by canonical column key
 * - Optionally attaches the parsed representation if row is valid
 */
export interface DraftFeedbackImportRow {
  /**
   * 1-based index of the row in the Excel sheet (including header row).
   * Useful for error reporting.
   */
  rowIndex: number;

  /**
   * Raw cell text values keyed by canonical header.
   * Cells that were missing in the source row will not appear here.
   */
  raw: Partial<Record<FeedbackExcelColumnKey, string>>;

  /**
   * Parsed and validated payload.
   * If parsing fails at row-level, this field will be null and
   * a corresponding ImportRowError will be produced.
   */
  parsed: SessionFeedbackExcelRow | null;
}

// =========================
// Import error / result types
// =========================

export type ImportErrorCode =
  | 'MISSING_REQUIRED_COLUMN'
  | 'INVALID_HEADER'
  | 'EMPTY_FILE'
  | 'ROW_LIMIT_EXCEEDED'
  | 'INVALID_SESSION_ID'
  | 'INVALID_STUDENT_ID'
  | 'SESSION_MISMATCH'
  | 'SESSION_TYPE_MISMATCH'
  | 'NOT_IN_ROSTER'
  | 'INVALID_ATTENDANCE'
  | 'INVALID_HOMEWORK'
  | 'INVALID_FEEDBACK_METRIC'
  | 'INVALID_SCORE_VALUE'
  | 'SCORE_NOT_ALLOWED_FOR_SESSION_TYPE'
  | 'DUPLICATE_STUDENT_IN_FILE'
  | 'ROW_PARSE_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Row-level error description used to build user-facing reports.
 */
export interface ImportRowError {
  /**
   * 1-based index of the row in Excel (including header row).
   */
  rowIndex: number;

  /**
   * Optional column key where the error occurred.
   * Can be omitted for structural / global row errors.
   */
  columnKey?: FeedbackExcelColumnKey;

  /**
   * Normalized error code that can be mapped to i18n messages on FE.
   */
  code: ImportErrorCode;

  /**
   * Human-readable message (server-side default, typically Vietnamese).
   */
  message: string;

  /**
   * Original cell value that caused the error, if applicable.
   */
  value?: string;
}

/**
 * Global import result summary.
 * Importer implementation will be responsible for filling this structure.
 */
export interface ImportFeedbackResult {
  /**
   * True nếu có ít nhất 1 dòng được import thành công.
   * Lưu ý: có thể vẫn có lỗi ở các dòng khác (partial success).
   */
  success: boolean;

  /**
   * True nếu có cả dòng thành công lẫn dòng lỗi.
   * Dùng để FE hiển thị trạng thái “thành công một phần” rõ ràng.
   */
  partialSuccess: boolean;

  /**
   * True nếu import có phát sinh lỗi (global/row/business).
   * Dùng để FE quyết định tone UI (warning/error) mà không hiểu nhầm `success`.
   */
  hasErrors: boolean;

  /**
   * Total number of data rows that were processed (excluding header).
   */
  processedCount: number;

  /**
   * Number of rows that were successfully parsed and scheduled for upsert.
   */
  successCount: number;

  /**
   * Number of rows that failed validation / parsing.
   */
  errorCount: number;

  /**
   * Detailed row-level errors.
   */
  errors: ImportRowError[];
}


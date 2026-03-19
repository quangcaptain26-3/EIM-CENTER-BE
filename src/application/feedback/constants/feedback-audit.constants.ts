/**
 * Audit constants cho các luồng Excel Feedback.
 * Mục tiêu: tránh magic string và thống nhất action/entity toàn hệ thống.
 */

export const FEEDBACK_EXCEL_AUDIT_ENTITY = 'feedback_excel' as const;
export const FEEDBACK_AUDIT_ENTITY = 'feedback' as const;

export const FeedbackExcelAuditAction = {
  TEMPLATE_DOWNLOAD: 'FEEDBACK_EXCEL_TEMPLATE_DOWNLOAD',
  REPORT_EXPORT: 'FEEDBACK_EXCEL_REPORT_EXPORT',
  IMPORT: 'FEEDBACK_EXCEL_IMPORT',
  FEEDBACK_UPSERT: 'FEEDBACK_UPSERT',
  SCORE_UPSERT: 'SCORE_UPSERT',
} as const;

export type FeedbackExcelAuditAction =
  (typeof FeedbackExcelAuditAction)[keyof typeof FeedbackExcelAuditAction];


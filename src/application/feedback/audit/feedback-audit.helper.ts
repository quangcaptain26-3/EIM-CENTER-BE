import { FeedbackExcelAuditAction, FEEDBACK_AUDIT_ENTITY, FEEDBACK_EXCEL_AUDIT_ENTITY } from '../constants/feedback-audit.constants';

export type FeedbackAuditActor = {
  actorId: string;
  actorRole: string;
};

export type AuditWriteInput = {
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  meta: Record<string, unknown>;
};

/**
 * Helper build payload audit cho module feedback.
 * Mục tiêu: meta gọn, nhất quán, không copy-paste giữa các flow.
 */
export class FeedbackAuditBuilder {
  static buildTemplateDownload(input: FeedbackAuditActor & { sessionId: string; classId?: string }): AuditWriteInput {
    return {
      actorUserId: input.actorId,
      action: FeedbackExcelAuditAction.TEMPLATE_DOWNLOAD,
      entity: FEEDBACK_EXCEL_AUDIT_ENTITY,
      entityId: input.sessionId,
      meta: {
        actorRole: input.actorRole,
        sessionId: input.sessionId,
        classId: input.classId,
      },
    };
  }

  static buildReportExport(
    input: FeedbackAuditActor & {
      classId: string;
      sessionId?: string;
      fromDate?: string;
      toDate?: string;
      includeScores?: boolean;
    },
  ): AuditWriteInput {
    return {
      actorUserId: input.actorId,
      action: FeedbackExcelAuditAction.REPORT_EXPORT,
      entity: FEEDBACK_EXCEL_AUDIT_ENTITY,
      entityId: input.classId,
      meta: {
        actorRole: input.actorRole,
        classId: input.classId,
        sessionId: input.sessionId,
        fromDate: input.fromDate,
        toDate: input.toDate,
        includeScores: input.includeScores,
      },
    };
  }

  static buildImport(
    input: FeedbackAuditActor & {
      sessionId: string;
      processedCount: number;
      successCount: number;
      errorCount: number;
    },
  ): AuditWriteInput {
    return {
      actorUserId: input.actorId,
      action: FeedbackExcelAuditAction.IMPORT,
      entity: FEEDBACK_EXCEL_AUDIT_ENTITY,
      entityId: input.sessionId,
      meta: {
        actorRole: input.actorRole,
        sessionId: input.sessionId,
        processedCount: input.processedCount,
        successCount: input.successCount,
        errorCount: input.errorCount,
      },
    };
  }

  static buildManualFeedbackUpsert(
    input: FeedbackAuditActor & { sessionId: string; affectedStudentCount: number },
  ): AuditWriteInput {
    return {
      actorUserId: input.actorId,
      action: FeedbackExcelAuditAction.FEEDBACK_UPSERT,
      entity: FEEDBACK_AUDIT_ENTITY,
      entityId: input.sessionId,
      meta: {
        actorRole: input.actorRole,
        sessionId: input.sessionId,
        affectedStudentCount: input.affectedStudentCount,
      },
    };
  }

  static buildManualScoreUpsert(
    input: FeedbackAuditActor & { sessionId: string; affectedStudentCount: number },
  ): AuditWriteInput {
    return {
      actorUserId: input.actorId,
      action: FeedbackExcelAuditAction.SCORE_UPSERT,
      entity: FEEDBACK_AUDIT_ENTITY,
      entityId: input.sessionId,
      meta: {
        actorRole: input.actorRole,
        sessionId: input.sessionId,
        affectedStudentCount: input.affectedStudentCount,
      },
    };
  }
}


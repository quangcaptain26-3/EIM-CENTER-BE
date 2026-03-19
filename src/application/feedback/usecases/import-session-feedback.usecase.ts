import { AppError } from "../../../shared/errors/app-error";
import { FeedbackRepoPort } from "../../../domain/feedback/repositories/feedback.repo.port";
import { ScoreRepoPort } from "../../../domain/feedback/repositories/score.repo.port";
import { FeedbackPolicy } from "../../../domain/feedback/services/feedback.policy";
import { ScorePolicy } from "../../../domain/feedback/services/score.policy";
import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { RosterRepoPort } from "../../../domain/classes/repositories/roster.repo.port";
import { FeedbackImporter, FeedbackExcelParseResult } from "../../../infrastructure/excel/excel.importer";
import type { Pool, PoolClient } from "pg";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import {
  ImportFeedbackResult,
  ImportRowError,
  SessionFeedbackExcelRow,
} from "../../../infrastructure/excel/feedback-excel.contract";

type Actor = { userId: string; roles: string[] };

export class ImportSessionFeedbackUseCase {
  constructor(
    private readonly feedbackRepo: FeedbackRepoPort,
    private readonly scoreRepo: ScoreRepoPort,
    private readonly sessionRepo: ISessionRepository,
    private readonly rosterRepo: RosterRepoPort,
    private readonly feedbackImporter: FeedbackImporter,
    private readonly dbPool: Pool,
    private readonly classRepo: ClassRepoPort,
  ) {}

  async execute(sessionId: string, buffer: Buffer, actor: Actor): Promise<ImportFeedbackResult> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw AppError.notFound("Không tìm thấy buổi học");
    }

    const klass = await this.classRepo.findById(session.classId);
    if (!klass) {
      throw AppError.notFound("Không tìm thấy lớp học của buổi học này");
    }
    if (klass.status !== "ACTIVE") {
      throw AppError.badRequest(`Không thể import nhận xét khi lớp đang ở trạng thái ${klass.status}`, {
        code: "CLASS/NOT_ACTIVE",
        classId: session.classId,
        status: klass.status,
      });
    }

    FeedbackPolicy.assertCanWriteSession({ ...session, id: sessionId }, actor);

    const parseResult = await this.feedbackImporter.parseSessionFeedbackDraft(buffer);

    // Nếu file hỏng hoàn toàn (lỗi global nghiêm trọng) thì trả luôn, không cố import
    if (parseResult.globalErrors.length > 0 && parseResult.drafts.length === 0) {
      return this.buildResultFromErrors(parseResult, [], [], []);
    }

    const roster = await this.rosterRepo.listRosterAtDate(session.classId, session.sessionDate);
    const allowedStudentIds = new Set(roster.map((s) => s.studentId));

    const {
      validRows,
      businessErrors,
    } = this.applyBusinessValidation(sessionId, session.sessionType, parseResult, allowedStudentIds);

    const { feedbackItems, scoreItems } = this.partitionUpsertItems(validRows, actor.userId, session.sessionType);

    // Transaction safety:
    // - Import feedback + score phải “all-or-nothing” để tránh feedback commit nhưng score rollback.
    // - Dùng 1 PoolClient chung (BEGIN/COMMIT) và truyền xuống repos qua `options.tx`.
    if (feedbackItems.length > 0 || scoreItems.length > 0) {
      const client: PoolClient = await this.dbPool.connect();
      try {
        await client.query("BEGIN");

        if (feedbackItems.length > 0) {
          await this.feedbackRepo.upsertMany(feedbackItems, { tx: client });
        }

        if (scoreItems.length > 0) {
          await this.scoreRepo.upsertMany(scoreItems, { tx: client });
        }

        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }

    return this.buildResultFromErrors(parseResult, businessErrors, feedbackItems, scoreItems);
  }

  private applyBusinessValidation(
    sessionId: string,
    sessionType: string,
    parseResult: FeedbackExcelParseResult,
    allowedStudentIds: Set<string>,
  ): {
    validRows: SessionFeedbackExcelRow[];
    businessErrors: ImportRowError[];
  } {
    const businessErrors: ImportRowError[] = [];

    // Phát hiện duplicate student trong file (theo studentId)
    const seenStudentIds = new Map<string, number[]>();
    parseResult.drafts.forEach((draft) => {
      // Chỉ tính duplicate cho các row parse hợp lệ để tránh “báo trùng oan”
      // khi một dòng parse thất bại nhưng có student_id raw.
      if (!draft.parsed) return;
      const studentId = draft.parsed.studentId;
      if (!studentId) return;
      const list = seenStudentIds.get(studentId) ?? [];
      list.push(draft.rowIndex);
      seenStudentIds.set(studentId, list);
    });

    const duplicateStudentIds = Array.from(seenStudentIds.entries())
      .filter(([, rows]) => rows.length > 1)
      .map(([id]) => id);

    const duplicateRowIndexes = new Set<number>();
    duplicateStudentIds.forEach((id) => {
      const rows = seenStudentIds.get(id) ?? [];
      rows.forEach((rowIndex) => duplicateRowIndexes.add(rowIndex));
    });

    const validRows: SessionFeedbackExcelRow[] = [];

    for (const draft of parseResult.drafts) {
      const parsed = draft.parsed;

      // Nếu parse-level đã lỗi thì không tiếp tục validate business
      if (!parsed) {
        continue;
      }

      const rowIndex = draft.rowIndex;

      // session_id trong file phải trùng với sessionId URL
      if (parsed.sessionId !== sessionId) {
        businessErrors.push({
          rowIndex,
          columnKey: "session_id",
          code: "SESSION_MISMATCH",
          message: "session_id trong file không khớp với buổi học đang import",
          value: draft.raw.session_id,
        });
        continue;
      }

      // session_type trong file phải khớp với loại buổi học (sau khi map TEST <-> QUIZ)
      if (!this.isSessionTypeCompatible(sessionType, parsed.sessionType)) {
        businessErrors.push({
          rowIndex,
          columnKey: "session_type",
          code: "SESSION_TYPE_MISMATCH",
          message: "session_type trong file không khớp với loại buổi học trên hệ thống",
          value: draft.raw.session_type,
        });
        continue;
      }

      // student_id phải thuộc roster lớp
      if (!allowedStudentIds.has(parsed.studentId)) {
        businessErrors.push({
          rowIndex,
          columnKey: "student_id",
          code: "NOT_IN_ROSTER",
          message: "Học viên không thuộc lớp của buổi học này",
          value: parsed.studentId,
        });
        continue;
      }

      // Duplicate student trong file
      if (duplicateRowIndexes.has(rowIndex)) {
        businessErrors.push({
          rowIndex,
          columnKey: "student_id",
          code: "DUPLICATE_STUDENT_IN_FILE",
          message: "Học viên xuất hiện nhiều lần trong file import",
          value: parsed.studentId,
        });
        continue;
      }

      // NORMAL session không được có điểm
      if (sessionType === "NORMAL" && this.hasAnyScore(parsed)) {
        businessErrors.push({
          rowIndex,
          code: "SCORE_NOT_ALLOWED_FOR_SESSION_TYPE",
          message: "Buổi học loại NORMAL không cho phép nhập điểm",
        });
        continue;
      }

      // Buổi học không phải NORMAL: nếu có điểm thì score_total phải không mâu thuẫn (policy normalize sẽ xử lý)
      // Nếu user nhập score_total nhưng không có kỹ năng thì báo lỗi rõ ở mức row
      if (sessionType !== "NORMAL" && parsed.scoreTotal !== null && !this.hasAnyScoreButTotal(parsed)) {
        businessErrors.push({
          rowIndex,
          columnKey: "score_total",
          code: "INVALID_SCORE_VALUE",
          message: "Không hợp lệ: có score_total nhưng không có điểm kỹ năng",
          value: draft.raw.score_total,
        });
        continue;
      }

      validRows.push(parsed);
    }

    return { validRows, businessErrors };
  }

  private partitionUpsertItems(
    rows: SessionFeedbackExcelRow[],
    teacherId: string,
    sessionType: string,
  ): {
    feedbackItems: Array<{
      sessionId: string;
      studentId: string;
      teacherId: string;
      attendance?: string | null;
      homework?: string | null;
      participation?: string | null;
      behavior?: string | null;
      languageUsage?: string | null;
      commentText?: string | null;
    }>;
    scoreItems: Array<{
      sessionId: string;
      studentId: string;
      scoreType: "TEST" | "MIDTERM" | "FINAL";
      listening?: number | null;
      reading?: number | null;
      writing?: number | null;
      speaking?: number | null;
      total?: number | null;
      note?: string | null;
    }>;
  } {
    const feedbackItems = rows.map((row) => ({
      sessionId: row.sessionId,
      studentId: row.studentId,
      teacherId,
      attendance: row.attendance ?? null,
      homework: row.homework ?? null,
      participation: row.participation !== null ? String(row.participation) : null,
      behavior: row.behavior !== null ? String(row.behavior) : null,
      languageUsage: row.languageUsage !== null ? String(row.languageUsage) : null,
      commentText: row.comment ?? null,
    }));

    const scoreItems: Array<{
      sessionId: string;
      studentId: string;
      scoreType: "TEST" | "MIDTERM" | "FINAL";
      listening?: number | null;
      reading?: number | null;
      writing?: number | null;
      speaking?: number | null;
      total?: number | null;
      note?: string | null;
    }> = [];

    if (sessionType === "NORMAL") {
      return { feedbackItems, scoreItems };
    }

    const scoreType = this.mapSessionTypeToScoreType(sessionType);

    rows.forEach((row) => {
      if (!this.hasAnyScore(row)) {
        return;
      }

      const normalized = ScorePolicy.normalizeScore({
        scoreType,
        listening: row.scoreListening,
        reading: row.scoreReading,
        writing: row.scoreWriting,
        speaking: row.scoreSpeaking,
        total: row.scoreTotal,
        note: row.scoreNote,
      });

      scoreItems.push({
        sessionId: row.sessionId,
        studentId: row.studentId,
        scoreType,
        listening: normalized.listening,
        reading: normalized.reading,
        writing: normalized.writing,
        speaking: normalized.speaking,
        total: normalized.total,
        note: normalized.note,
      });
    });

    return { feedbackItems, scoreItems };
  }

  private buildResultFromErrors(
    parseResult: FeedbackExcelParseResult,
    businessErrors: ImportRowError[],
    feedbackItems: unknown[],
    scoreItems: unknown[],
  ): ImportFeedbackResult {
    const allErrors = [...parseResult.globalErrors, ...parseResult.rowErrors, ...businessErrors];
    const processedCount = parseResult.drafts.length;
    const successCount = feedbackItems.length; // số feedback rows upsert được (tối thiểu)
    const errorCount = allErrors.length;
    const hasErrors = errorCount > 0;
    const partialSuccess = successCount > 0 && hasErrors;

    return {
      // success: có ít nhất 1 dòng đã được ghi (tránh hiểu nhầm “success=false nhưng DB đã cập nhật”).
      success: successCount > 0,
      partialSuccess,
      hasErrors,
      processedCount,
      successCount,
      errorCount,
      errors: allErrors,
    };
  }

  private hasAnyScore(row: SessionFeedbackExcelRow): boolean {
    return (
      row.scoreListening !== null ||
      row.scoreReading !== null ||
      row.scoreWriting !== null ||
      row.scoreSpeaking !== null ||
      row.scoreTotal !== null
    );
  }

  private hasAnyScoreButTotal(row: SessionFeedbackExcelRow): boolean {
    return (
      row.scoreListening !== null ||
      row.scoreReading !== null ||
      row.scoreWriting !== null ||
      row.scoreSpeaking !== null
    );
  }

  // ensureScoreTotal đã được thay bằng ScorePolicy.normalizeScore để thống nhất policy giữa import và API.

  /**
   * session.sessionType (backend) vs session_type (Excel):
   * - NORMAL  <-> NORMAL
   * - TEST    <-> QUIZ
   * - MIDTERM <-> MIDTERM
   * - FINAL   <-> FINAL
   */
  private isSessionTypeCompatible(
    backendSessionType: string,
    excelSessionType: string,
  ): boolean {
    if (backendSessionType === "TEST") {
      return excelSessionType === "QUIZ";
    }
    return backendSessionType === excelSessionType;
  }

  private mapSessionTypeToScoreType(
    backendSessionType: string,
  ): "TEST" | "MIDTERM" | "FINAL" {
    if (backendSessionType === "MIDTERM" || backendSessionType === "FINAL") {
      return backendSessionType;
    }
    // Mặc định coi TEST (QUIZ) là dạng TEST
    return "TEST";
  }
}


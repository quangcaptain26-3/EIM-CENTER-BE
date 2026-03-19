import { ISessionRepository } from "../../../domain/sessions/repositories/session.repo.port";
import { FeedbackRepoPort } from "../../../domain/feedback/repositories/feedback.repo.port";
import { RosterRepoPort } from "../../../domain/classes/repositories/roster.repo.port";
import { ScoreRepoPort } from "../../../domain/feedback/repositories/score.repo.port";
import { FeedbackExporter, SessionFeedbackTemplateRowInput } from "../../../infrastructure/excel/feedback.exporter";
import { AppError } from "../../../shared/errors/app-error";
import { Session } from "../../../domain/sessions/entities/session.entity";
import { SessionScore } from "../../../domain/feedback/entities/session-score.entity";
import { FeedbackActor, FeedbackPolicy } from "../../../domain/feedback/services/feedback.policy";
import { ClassRepoPort } from "../../../domain/classes/repositories/class.repo.port";
import type { Writable } from "stream";

export interface ExportFeedbackFilter {
  classId: string;
  fromDate?: string;
  toDate?: string;
  sessionId?: string;
  includeScores?: boolean;
}

export class ExportFeedbackUseCase {
  private readonly MAX_EXPORT_SESSIONS = 120;
  private readonly MAX_EXPORT_ROWS = 15000;

  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly feedbackRepo: FeedbackRepoPort,
    private readonly scoreRepo: ScoreRepoPort,
    private readonly rosterRepo: RosterRepoPort,
    private readonly feedbackExporter: FeedbackExporter,
    private readonly classRepo: ClassRepoPort,
  ) {}

  /**
   * Lấy feedback (và điểm số nếu có) của lớp trong khoảng thời gian hoặc 1 session cụ thể
   * và xuất ra Excel theo canonical sheet SessionFeedback.
   */
  async execute(filter: ExportFeedbackFilter, actor: FeedbackActor): Promise<Buffer> {
    const rows = await this.buildRowsForExport(filter, actor);
    return this.feedbackExporter.exportSessionFeedbackReport(rows);
  }

  async stream(filter: ExportFeedbackFilter, actor: FeedbackActor, writable: Writable): Promise<void> {
    const rows = await this.buildRowsForExport(filter, actor);
    await this.feedbackExporter.streamSessionFeedbackReport(rows, writable);
  }

  private async buildRowsForExport(filter: ExportFeedbackFilter, actor: FeedbackActor): Promise<SessionFeedbackTemplateRowInput[]> {
    const { classId, fromDate, toDate, sessionId, includeScores = true } = filter;

    const klass = await this.classRepo.findById(classId);
    if (!klass) {
      // Security-by-disclosure: với TEACHER, tránh lộ việc class tồn tại hay không.
      // ROOT/DIRECTOR/ACADEMIC vẫn cần 404 đúng để debug/ops.
      if (actor.roles.includes("TEACHER") && !actor.roles.some((r) => ["ROOT", "DIRECTOR", "ACADEMIC"].includes(r))) {
        throw AppError.forbidden("Bạn không có quyền export lớp này", {
          code: "FEEDBACK_POLICY/TEACHER_CLASS_SCOPE_REQUIRED",
          classId,
        });
      }
      throw AppError.notFound('Không tìm thấy lớp học');
    }
    if (klass.status !== 'ACTIVE') {
      // Security-by-disclosure: với TEACHER, tránh lộ trạng thái lớp.
      if (actor.roles.includes("TEACHER") && !actor.roles.some((r) => ["ROOT", "DIRECTOR", "ACADEMIC"].includes(r))) {
        throw AppError.forbidden("Bạn không có quyền export lớp này", {
          code: "FEEDBACK_POLICY/TEACHER_CLASS_SCOPE_REQUIRED",
          classId,
        });
      }
      throw AppError.badRequest(`Không thể export khi lớp đang ở trạng thái ${klass.status}`, {
        code: 'CLASS/NOT_ACTIVE',
        classId,
        status: klass.status,
      });
    }

    const resolved = await this.resolveSessions({ classId, fromDate, toDate, sessionId });
    const sessions = FeedbackPolicy.filterSessionsCanExport(resolved, actor) as Session[];

    if (sessionId && sessions.length === 0) {
      throw AppError.forbidden('Bạn không có quyền export buổi học này', {
        code: 'FEEDBACK_POLICY/TEACHER_NOT_OWNER',
        sessionId,
      });
    }

    // Nếu không có session nào phù hợp, trả file rỗng nhưng vẫn có header chuẩn để user dễ hiểu
    if (sessions.length === 0) {
      return [];
    }

    const allRows: SessionFeedbackTemplateRowInput[] = [];
    const warnings: Array<{
      sessionId: string;
      sessionDate: Date;
      studentId: string;
      reason: string;
    }> = [];

    // Giới hạn concurrency để tránh pool exhaustion khi export theo nhiều sessions.
    const CONCURRENCY = 3;
    for (let i = 0; i < sessions.length; i += CONCURRENCY) {
      const batch = sessions.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (session) => {
          // Roster theo thời điểm session để tránh “silent drift” khi roster hiện tại đã đổi.
          const rosterAtDate = await this.rosterRepo.listRosterAtDate(session.classId, session.sessionDate);
          const rosterSet = new Set(rosterAtDate.map((s) => s.studentId));

          const feedbacks = await this.feedbackRepo.listBySession(session.id);
          const feedbackMap = new Map(
            feedbacks.map((fb) => [
              fb.studentId,
              {
                attendance: fb.attendance ?? null,
                homework: fb.homework ?? null,
                participation: fb.participation ?? null,
                behavior: fb.behavior ?? null,
                languageUsage: fb.languageUsage ?? null,
                comment: fb.commentText ?? null,
              },
            ]),
          );

          let scoreByStudent: Map<string, SessionScore[]> = new Map();
          let scoreStudentIds: string[] = [];
          if (includeScores) {
            const scores = await this.scoreRepo.listBySession(session.id);
            scoreByStudent = this.groupScoresByStudent(scores);
            scoreStudentIds = Array.from(new Set(scores.map((s) => s.studentId)));
          }

          // Nếu có feedback/score cho student không nằm trong roster tại thời điểm session → cảnh báo.
          const fbStudentIds = feedbacks.map((f) => f.studentId);
          const allTouched = new Set<string>([...fbStudentIds, ...scoreStudentIds]);
          allTouched.forEach((studentId) => {
            if (!rosterSet.has(studentId)) {
              warnings.push({
                sessionId: session.id,
                sessionDate: session.sessionDate,
                studentId,
                reason: "Có feedback/score nhưng học viên không thuộc roster tại ngày buổi học (roster drift hoặc dữ liệu legacy).",
              });
            }
          });

          const excelSessionType = this.mapSessionTypeToExcelValue(session);

          rosterAtDate.forEach((student) => {
            const fb = feedbackMap.get(student.studentId);
            const scores = scoreByStudent.get(student.studentId) ?? [];

            const primaryScore = scores[0]; // hiện tại mỗi session + student thường chỉ có 1 scoreType

            const row: SessionFeedbackTemplateRowInput = {
              sessionId: session.id,
              sessionDate: session.sessionDate,
              sessionType: excelSessionType,
              classCode: session.classId,
              studentId: student.studentId,
              studentName: student.fullName,
              attendance: fb?.attendance ?? null,
              homework: fb?.homework ?? null,
              participation: fb?.participation ?? null,
              behavior: fb?.behavior ?? null,
              languageUsage: fb?.languageUsage ?? null,
              comment: fb?.comment ?? null,
              scoreListening: includeScores ? primaryScore?.listening ?? null : null,
              scoreReading: includeScores ? primaryScore?.reading ?? null : null,
              scoreWriting: includeScores ? primaryScore?.writing ?? null : null,
              scoreSpeaking: includeScores ? primaryScore?.speaking ?? null : null,
              scoreTotal: includeScores ? primaryScore?.total ?? null : null,
              scoreNote: includeScores ? primaryScore?.note ?? null : null,
            };

            allRows.push(row);
          });

          if (allRows.length > this.MAX_EXPORT_ROWS) {
            throw AppError.badRequest(
              `Dung lượng export vượt ngưỡng an toàn (${this.MAX_EXPORT_ROWS} dòng). Vui lòng thu hẹp khoảng ngày hoặc export theo từng buổi.`,
              {
                code: "FEEDBACK_EXPORT/ROW_LIMIT_EXCEEDED",
                classId,
                rowLimit: this.MAX_EXPORT_ROWS,
                fromDate,
                toDate,
                sessionId,
              },
            );
          }
        }),
      );
    }

    // Attach warnings for exporter (to avoid breaking signature widely).
    (allRows as any).__warnings = warnings;
    return allRows;
  }

  /**
   * Chọn danh sách session theo filter:
   * - Nếu có sessionId: chỉ lấy đúng buổi đó, verify thuộc classId.
   * - Ngược lại: lấy toàn bộ buổi của lớp rồi lọc theo fromDate/toDate.
   */
  private async resolveSessions(params: {
    classId: string;
    fromDate?: string;
    toDate?: string;
    sessionId?: string;
  }): Promise<Session[]> {
    const { classId, fromDate, toDate, sessionId } = params;

    if (sessionId) {
      const session = await this.sessionRepo.findById(sessionId);
      if (!session) {
        throw AppError.notFound('Không tìm thấy buổi học để export báo cáo');
      }
      if (session.classId !== classId) {
        throw AppError.badRequest('Buổi học không thuộc lớp được yêu cầu export');
      }
      return [session];
    }

    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;
    if (to) {
      to.setHours(23, 59, 59, 999);
    }

    const sessions = await this.sessionRepo.listByClassInRange(classId, {
      fromDate: from,
      toDate: to,
      // Lấy dư 1 để detect vượt ngưỡng
      limit: this.MAX_EXPORT_SESSIONS + 1,
    });

    if (sessions.length > this.MAX_EXPORT_SESSIONS) {
      throw AppError.badRequest(
        `Số buổi học cần export vượt ngưỡng an toàn (${this.MAX_EXPORT_SESSIONS} buổi). Vui lòng thu hẹp khoảng ngày hoặc chọn session cụ thể.`,
        {
          code: "FEEDBACK_EXPORT/SESSION_LIMIT_EXCEEDED",
          classId,
          sessionLimit: this.MAX_EXPORT_SESSIONS,
          fromDate,
          toDate,
        },
      );
    }

    return sessions;
  }

  private groupScoresByStudent(scores: SessionScore[]): Map<string, SessionScore[]> {
    const map = new Map<string, SessionScore[]>();
    scores.forEach((score) => {
      const list = map.get(score.studentId) ?? [];
      list.push(score);
      map.set(score.studentId, list);
    });
    return map;
  }

  /**
   * Map Session.sessionType ở Backend sang giá trị session_type trong Excel.
   * - NORMAL  -> NORMAL
   * - TEST    -> QUIZ (theo ngôn ngữ spec trước đó)
   * - MIDTERM -> MIDTERM
   * - FINAL   -> FINAL
   */
  private mapSessionTypeToExcelValue(session: Session): string {
    if (session.sessionType === 'TEST') {
      return 'QUIZ';
    }
    return session.sessionType;
  }
}

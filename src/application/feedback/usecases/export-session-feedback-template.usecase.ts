import { ISessionRepository } from '../../../domain/sessions/repositories/session.repo.port';
import { RosterRepoPort } from '../../../domain/classes/repositories/roster.repo.port';
import { FeedbackRepoPort } from '../../../domain/feedback/repositories/feedback.repo.port';
import { FeedbackExporter, SessionFeedbackTemplateRowInput } from '../../../infrastructure/excel/feedback.exporter';
import { AppError } from '../../../shared/errors/app-error';
import { ClassRepoPort } from '../../../domain/classes/repositories/class.repo.port';
import type { Writable } from "stream";

/**
 * UseCase xuất file Excel template cho 1 buổi học (session).
 * - Lấy thông tin session (ngày, loại buổi, lớp).
 * - Lấy roster lớp để biết danh sách học viên.
 * - Lấy feedback hiện tại (nếu có) để pre-fill (attendance, homework, ...).
 * - Giao cho FeedbackExporter build workbook theo canonical Excel contract.
 */
export class ExportSessionFeedbackTemplateUseCase {
  constructor(
    private readonly sessionRepo: ISessionRepository,
    private readonly rosterRepo: RosterRepoPort,
    private readonly feedbackRepo: FeedbackRepoPort,
    private readonly feedbackExporter: FeedbackExporter,
    private readonly classRepo: ClassRepoPort,
  ) {}

  async execute(sessionId: string): Promise<Buffer> {
    const templateRows = await this.buildTemplateRows(sessionId);
    return this.feedbackExporter.exportSessionTemplate(templateRows);
  }

  async stream(sessionId: string, writable: Writable): Promise<void> {
    const templateRows = await this.buildTemplateRows(sessionId);
    await this.feedbackExporter.streamSessionTemplate(templateRows, writable);
  }

  private async buildTemplateRows(sessionId: string): Promise<SessionFeedbackTemplateRowInput[]> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw AppError.notFound('Không tìm thấy buổi học');
    }

    const klass = await this.classRepo.findById(session.classId);
    if (!klass) {
      throw AppError.notFound('Không tìm thấy lớp học của buổi học này');
    }
    if (klass.status !== 'ACTIVE') {
      throw AppError.badRequest(`Không thể tải template khi lớp đang ở trạng thái ${klass.status}`, {
        code: 'CLASS/NOT_ACTIVE',
        classId: session.classId,
        status: klass.status,
      });
    }

    // Lấy sĩ số lớp tương ứng với buổi học
    const roster = await this.rosterRepo.listRosterAtDate(session.classId, session.sessionDate);

    // Lấy feedback hiện tại để pre-fill (nếu đã được nhập trước đó)
    const existingFeedbacks = await this.feedbackRepo.listBySession(sessionId);
    const feedbackMap = new Map(
      existingFeedbacks.map((fb) => [
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

    return roster.map((student) => {
      const fb = feedbackMap.get(student.studentId);

      // Đồng bộ với Excel contract: TEST của hệ thống được thể hiện là QUIZ trong file.
      const excelSessionType = session.sessionType === "TEST" ? "QUIZ" : session.sessionType;

      return {
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
      };
    });
  }
}


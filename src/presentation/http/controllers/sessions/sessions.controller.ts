import { Request, Response } from "express";
import { GenerateSessionsUseCase } from "../../../../application/sessions/usecases/generate-sessions.usecase";
import { ListClassSessionsUseCase } from "../../../../application/sessions/usecases/list-class-sessions.usecase";
import { GetSessionUseCase } from "../../../../application/sessions/usecases/get-session.usecase";
import { UpdateSessionUseCase } from "../../../../application/sessions/usecases/update-session.usecase";
import { ListTeacherSessionsUseCase } from "../../../../application/sessions/usecases/list-teacher-sessions.usecase";
import { SessionMapper } from "../../../../application/sessions/mappers/sessions.mapper";

/**
 * Controller xử lý các request liên quan đến Buổi học (Sessions)
 */
export class SessionsController {
  constructor(
    private readonly generateSessionsUseCase: GenerateSessionsUseCase,
    private readonly listClassSessionsUseCase: ListClassSessionsUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly updateSessionUseCase: UpdateSessionUseCase,
    private readonly listTeacherSessionsUseCase: ListTeacherSessionsUseCase
  ) {}

  /**
   * Sinh danh sách buổi học cho lớp
   * POST /api/v1/classes/:id/sessions/generate
   */
  generateSessions = async (req: Request, res: Response) => {
    const classId = req.params.id as string;
    const sessions = await this.generateSessionsUseCase.execute(classId, req.body);
    return res.status(201).json({
      success: true,
      data: sessions.map(SessionMapper.toResponse),
    });
  };

  /**
   * Lấy danh sách buổi học của lớp
   * GET /api/v1/classes/:id/sessions
   */
  listClassSessions = async (req: Request, res: Response) => {
    const classId = req.params.id as string;
    const actor = req.user
      ? { userId: req.user.userId, roles: req.user.roles ?? [] }
      : undefined;
    const sessions = await this.listClassSessionsUseCase.execute(classId, actor);
    return res.status(200).json({
      success: true,
      data: sessions.map(SessionMapper.toResponse),
    });
  };
  
  /**
   * Lấy danh sách buổi học của giáo viên
   * GET /api/v1/sessions/teacher/:teacherId
   */
  listTeacherSessions = async (req: Request, res: Response) => {
    const teacherId = req.params.teacherId as string;
    const sessions = await this.listTeacherSessionsUseCase.execute(teacherId);
    return res.status(200).json({
      success: true,
      data: sessions.map(SessionMapper.toResponse),
    });
  };

  /**
   * Lấy chi tiết buổi học
   * GET /api/v1/sessions/:sessionId
   */
  getSession = async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId as string;
    const session = await this.getSessionUseCase.execute(sessionId);
    return res.status(200).json({
      success: true,
      data: SessionMapper.toResponse(session),
    });
  };

  /**
   * Cập nhật buổi học (Đổi lịch, set coverTeacher...)
   * PATCH /api/v1/sessions/:sessionId
   */
  updateSession = async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId as string;
    const { auditWriter } = req.app.locals.container.system;

    // Snapshot trước khi update để audit rõ ràng (tránh mất dấu thay đổi cover/reschedule).
    const before = await this.getSessionUseCase.execute(sessionId);
    const updatedSession = await this.updateSessionUseCase.execute(sessionId, req.body);

    // Audit theo loại action (reschedule vs cover teacher).
    // Không log dữ liệu thừa; chỉ log before/after và note nếu có.
    if (req.body?.sessionDate && new Date(req.body.sessionDate).getTime() !== new Date(before.sessionDate).getTime()) {
      await auditWriter.write(req.user?.userId, "SESSION_RESCHEDULE", "session", sessionId, {
        classId: before.classId,
        fromDate: before.sessionDate,
        toDate: updatedSession.sessionDate,
        note: req.body?.note ?? null,
      });
    }

    if (req.body?.coverTeacherId !== undefined && before.coverTeacherId !== updatedSession.coverTeacherId) {
      await auditWriter.write(req.user?.userId, "SESSION_COVER_TEACHER_UPDATE", "session", sessionId, {
        classId: before.classId,
        fromCoverTeacherId: before.coverTeacherId ?? null,
        toCoverTeacherId: updatedSession.coverTeacherId ?? null,
      });
    }

    if (
      (req.body?.unitNo !== undefined && before.unitNo !== updatedSession.unitNo) ||
      (req.body?.lessonNo !== undefined && before.lessonNo !== updatedSession.lessonNo)
    ) {
      await auditWriter.write(req.user?.userId, "SESSION_CURRICULUM_UPDATE", "session", sessionId, {
        classId: before.classId,
        before: {
          unitNo: before.unitNo,
          lessonNo: before.lessonNo,
        },
        after: {
          unitNo: updatedSession.unitNo,
          lessonNo: updatedSession.lessonNo,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: SessionMapper.toResponse(updatedSession),
    });
  };
}

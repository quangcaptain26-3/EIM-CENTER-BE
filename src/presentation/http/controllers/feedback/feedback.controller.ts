import { Request, Response } from 'express';
import { buildContainer } from '../../../../bootstrap/container';
import { UpsertFeedbackBody } from '../../../../application/feedback/dtos/feedback.dto';
import { ListStudentFeedbackQuery } from '../../../../application/feedback/dtos/list.dto';
import { UpsertScoresBody } from '../../../../application/feedback/dtos/score.dto';
import { AppError } from '../../../../shared/errors/app-error';
import { FeedbackAuditBuilder } from '../../../../application/feedback/audit/feedback-audit.helper';
import { createReadStream, existsSync } from "fs";
import { FeedbackExportJobsStore } from "./feedback-export-jobs.store";

const ROLE_PRECEDENCE = ["ROOT", "DIRECTOR", "ACADEMIC", "SALES", "ACCOUNTANT", "TEACHER"] as const;

const resolveActorRole = (roles: string[]): string => {
  for (const role of ROLE_PRECEDENCE) {
    if (roles.includes(role)) return role;
  }
  return roles[0] ?? "UNKNOWN";
};

export class FeedbackController {
  private readonly exportJobs = FeedbackExportJobsStore.getInstance();
  /**
   * GET /sessions/:sessionId/feedback
   * API lấy danh sách nhận xét giáo viên cho một buổi học (dựa theo roster của lớp).
   * Dành cho: ROOT, DIRECTOR, ACADEMIC, ACCOUNTANT, TEACHER
   */
  async getSessionFeedback(req: Request, res: Response) {
    const sessionId = String(req.params.sessionId);
    // Tuy nhiên UseCase ListSessionFeedback hiện tại cần cả classId và sessionId.
    // Lấy classId từ session lookup trước
    const container = buildContainer();
    const session = await container.sessions.getSessionUseCase.execute(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy buổi học' });
    }

    const feedbacks = await container.feedback.listSessionFeedbackUseCase.execute(session.classId, sessionId as string);
    return res.json({ success: true, data: feedbacks });
  }

  /**
   * GET /sessions/:sessionId/feedback/template
   * Tải file Excel template cho buổi học:
   * - Có sẵn session_id, class_code, student_id, student_name.
   * - Các cột nhận xét/điểm để trống hoặc pre-fill từ dữ liệu hiện tại.
   */
  async downloadSessionFeedbackTemplate(req: Request, res: Response) {
    const sessionId = req.params.sessionId as string;

    const container = buildContainer();
    const session = await container.sessions.getSessionUseCase.execute(sessionId);

    // Audit: chỉ log metadata, không log nội dung file
    const audit = FeedbackAuditBuilder.buildTemplateDownload({
      actorId: req.user!.userId,
      actorRole: resolveActorRole(req.user!.roles),
      sessionId,
      classId: session?.classId,
    });
    await container.system.auditWriter.write(audit.actorUserId, audit.action, audit.entity, audit.entityId, audit.meta);

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="feedback-template-${sessionId}-${dateStr}.xlsx"`,
    );

    await container.feedback.exportSessionFeedbackTemplateUseCase.stream(sessionId, res);
    return res.end();
  }

  /**
   * POST /sessions/:sessionId/feedback/upsert
   * Cập nhật nhận xét cho các học viên trong buổi học
   */
  async upsertSessionFeedback(req: Request, res: Response) {
    const sessionId = req.params.sessionId as string;
    const body = req.body as UpsertFeedbackBody;
    const actor = {
      userId: req.user!.userId,
      roles: req.user!.roles,
    };

    const container = buildContainer();
    const result = await container.feedback.upsertSessionFeedbackUseCase.execute(sessionId as string, body, actor);

    const isManagerOverride = actor.roles.includes("ACADEMIC") || actor.roles.includes("ROOT");
    const audit = FeedbackAuditBuilder.buildManualFeedbackUpsert({
      actorId: actor.userId,
      actorRole: resolveActorRole(actor.roles),
      sessionId,
      affectedStudentCount: body.items.length,
      sessionDate: result.sessionDate,
      overrideDeadline: isManagerOverride,
    });
    await container.system.auditWriter.write(audit.actorUserId, audit.action, audit.entity, audit.entityId, audit.meta);

    return res.json({ success: true, data: result.data });
  }

  /**
   * POST /sessions/:sessionId/feedback/import
   * Ghi nhận đánh giá từ file excel
   */
  async importFeedbackBySession(req: Request, res: Response) {
    const sessionId = req.params.sessionId as string;
    
    // Yêu cầu middleware multer gán file vào req.file
    if (!req.file || !req.file.buffer) {
      throw new AppError('File không hợp lệ hoặc không tồn tại', 'BAD_REQUEST', 400);
    }
    // Defense-in-depth: đảm bảo đúng định dạng .xlsx (tránh user bypass client validation)
    const originalName = String(req.file.originalname ?? '').toLowerCase();
    if (!originalName.endsWith('.xlsx')) {
      throw new AppError('Chỉ hỗ trợ file Excel định dạng .xlsx', 'BAD_REQUEST', 400);
    }

    const actor = {
      userId: req.user!.userId,
      roles: req.user!.roles,
    };

    const container = buildContainer();
    const result = await container.feedback.importSessionFeedbackUseCase.execute(
      sessionId,
      req.file.buffer,
      actor,
    );

    const isManagerOverride = actor.roles.includes("ACADEMIC") || actor.roles.includes("ROOT");
    const audit = FeedbackAuditBuilder.buildImport({
      actorId: actor.userId,
      actorRole: resolveActorRole(actor.roles),
      sessionId,
      processedCount: result.processedCount,
      successCount: result.successCount,
      errorCount: result.errorCount,
      sessionDate: result.sessionDate,
      overrideDeadline: isManagerOverride,
    });
    await container.system.auditWriter.write(audit.actorUserId, audit.action, audit.entity, audit.entityId, audit.meta);

    return res.json({ success: true, data: result });
  }

  /**
   * GET /classes/:classId/export
   * Xuất báo cáo điểm danh, nhận xét của lớp ra Excel
   */
  async exportFeedbackByClass(req: Request, res: Response) {
    const classId = req.params.classId as string;
    const fromDate = req.query.fromDate ? req.query.fromDate.toString() : undefined;
    const toDate = req.query.toDate ? req.query.toDate.toString() : undefined;
    const sessionId = req.query.sessionId ? req.query.sessionId.toString() : undefined;
    const includeScores =
      typeof req.query.includeScores === 'string'
        ? req.query.includeScores.toString() === 'true'
        : true;

    const { userId, roles } = req.user!;
    const actor = { userId, roles };
    const actorRole = resolveActorRole(roles);

    const container = buildContainer();
    // Phân quyền coarse theo role (fine-grained ownership ở UseCase)
    if (!roles.some((role) => ["DIRECTOR", "ACADEMIC", "TEACHER"].includes(role))) {
      throw new AppError('Bạn không có quyền thực hiện hành động này', 'FORBIDDEN', 403);
    }

    const audit = FeedbackAuditBuilder.buildReportExport({
      actorId: actor.userId,
      actorRole,
      classId,
      fromDate,
      toDate,
      sessionId,
      includeScores,
    });
    await container.system.auditWriter.write(audit.actorUserId, audit.action, audit.entity, audit.entityId, audit.meta);

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="feedback-${classId}-${dateStr}.xlsx"`);

    await container.feedback.exportFeedbackUseCase.stream(
      {
        classId,
        fromDate,
        toDate,
        sessionId,
        includeScores,
      },
      actor,
      res,
    );
    return res.end();
  }

  /**
   * POST /classes/:classId/export/jobs
   * Tạo async export job để tránh timeout cho dataset lớn.
   */
  async createExportFeedbackJob(req: Request, res: Response) {
    const classId = req.params.classId as string;
    const fromDate = req.body?.fromDate ? String(req.body.fromDate) : undefined;
    const toDate = req.body?.toDate ? String(req.body.toDate) : undefined;
    const sessionId = req.body?.sessionId ? String(req.body.sessionId) : undefined;
    const includeScores = typeof req.body?.includeScores === "boolean" ? req.body.includeScores : true;

    const actor = {
      userId: req.user!.userId,
      roles: req.user!.roles,
    };
    const container = buildContainer();
    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `feedback-${classId}-${dateStr}.xlsx`;

    const payload = { classId, fromDate, toDate, sessionId, includeScores, actor };
    const job = await this.exportJobs.createAndStart({
      ownerUserId: actor.userId,
      payload,
      fileName,
      runner: async ({ payload: p, writable, setProgress, isCancelled }) => {
        await setProgress(20);
        if (isCancelled()) {
          throw new Error("JOB_CANCELLED");
        }
        await container.feedback.exportFeedbackUseCase.stream(
          {
            classId: p.classId,
            fromDate: p.fromDate,
            toDate: p.toDate,
            sessionId: p.sessionId,
            includeScores: p.includeScores,
          },
          p.actor,
          writable,
        );
        await setProgress(95);
      },
    });

    return res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
      },
    });
  }

  /**
   * GET /classes/:classId/export/jobs/:jobId
   */
  async getExportFeedbackJob(req: Request, res: Response) {
    const jobId = String(req.params.jobId);
    const job = await this.exportJobs.get(jobId);
    if (!job) {
      throw AppError.notFound("Không tìm thấy export job");
    }
    if (job.ownerUserId !== req.user!.userId && !req.user!.roles.some((r) => ["DIRECTOR", "ACADEMIC"].includes(r))) {
      throw AppError.forbidden("Bạn không có quyền xem export job này");
    }
    return res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: job.error ?? null,
        createdAt: job.createdAt,
        startedAt: job.startedAt ?? null,
        finishedAt: job.finishedAt ?? null,
      },
    });
  }

  /**
   * POST /classes/:classId/export/jobs/:jobId/cancel
   */
  async cancelExportFeedbackJob(req: Request, res: Response) {
    const jobId = String(req.params.jobId);
    const job = await this.exportJobs.get(jobId);
    if (!job) {
      throw AppError.notFound("Không tìm thấy export job");
    }
    if (job.ownerUserId !== req.user!.userId && !req.user!.roles.some((r) => ["DIRECTOR", "ACADEMIC"].includes(r))) {
      throw AppError.forbidden("Bạn không có quyền hủy export job này");
    }
    const updated = await this.exportJobs.requestCancel(jobId);
    if (!updated) {
      throw AppError.notFound("Không tìm thấy export job");
    }
    return res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        progress: updated.progress,
      },
    });
  }

  /**
   * POST /classes/:classId/export/jobs/:jobId/retry
   */
  async retryExportFeedbackJob(req: Request, res: Response) {
    const jobId = String(req.params.jobId);
    const existing = await this.exportJobs.get(jobId);
    if (!existing) {
      throw AppError.notFound("Không tìm thấy export job");
    }
    if (existing.ownerUserId !== req.user!.userId && !req.user!.roles.some((r) => ["DIRECTOR", "ACADEMIC"].includes(r))) {
      throw AppError.forbidden("Bạn không có quyền retry export job này");
    }

    const container = buildContainer();
    const retried = await this.exportJobs.retry(jobId, async ({ payload, writable, setProgress, isCancelled }) => {
      await setProgress(20);
      if (isCancelled()) {
        throw new Error("JOB_CANCELLED");
      }
      await container.feedback.exportFeedbackUseCase.stream(
        {
          classId: payload.classId,
          fromDate: payload.fromDate,
          toDate: payload.toDate,
          sessionId: payload.sessionId,
          includeScores: payload.includeScores,
        },
        payload.actor,
        writable,
      );
      await setProgress(95);
    });

    if (!retried) {
      throw AppError.notFound("Không tìm thấy export job");
    }

    return res.json({
      success: true,
      data: {
        id: retried.id,
        status: retried.status,
        progress: retried.progress,
        attempts: retried.attempts,
        maxAttempts: retried.maxAttempts,
      },
    });
  }

  /**
   * GET /classes/:classId/export/jobs/:jobId/download
   */
  async downloadExportFeedbackJob(req: Request, res: Response) {
    const jobId = String(req.params.jobId);
    const job = await this.exportJobs.get(jobId);
    if (!job) {
      throw AppError.notFound("Không tìm thấy export job");
    }
    if (job.ownerUserId !== req.user!.userId && !req.user!.roles.some((r) => ["DIRECTOR", "ACADEMIC"].includes(r))) {
      throw AppError.forbidden("Bạn không có quyền tải file từ export job này");
    }
    if (job.status !== "completed" || !job.filePath || !existsSync(job.filePath)) {
      throw AppError.badRequest("Export job chưa sẵn sàng để tải file");
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${job.fileName}"`);
    const fileStream = createReadStream(job.filePath);
    fileStream.pipe(res);
  }

  /**
   * GET /students/:id/feedback
   */
  async getStudentFeedback(req: Request, res: Response) {
    const studentId = req.params.id;
    const { limit, offset } = req.query as unknown as ListStudentFeedbackQuery;

    const container = buildContainer();
    const feedbacks = await container.feedback.listStudentFeedbackUseCase.execute(studentId as string, Number(limit), Number(offset));
    
    return res.json({ success: true, data: feedbacks });
  }

  /**
   * POST /sessions/:sessionId/scores/upsert
   * Nhập điểm thi cho buổi học (TEST/MIDTERM/FINAL)
   */
  async upsertSessionScores(req: Request, res: Response) {
    const sessionId = String(req.params.sessionId);
    const body = req.body as UpsertScoresBody;
    const actor = {
      userId: req.user!.userId,
      roles: req.user!.roles,
    };

    const container = buildContainer();
    const result = await container.feedback.upsertSessionScoresUseCase.execute(sessionId as string, body, actor);

    const isManagerOverride = actor.roles.includes("ACADEMIC") || actor.roles.includes("ROOT");
    const audit = FeedbackAuditBuilder.buildManualScoreUpsert({
      actorId: actor.userId,
      actorRole: resolveActorRole(actor.roles),
      sessionId,
      affectedStudentCount: body.items.length,
      sessionDate: result.sessionDate,
      overrideDeadline: isManagerOverride,
    });
    await container.system.auditWriter.write(audit.actorUserId, audit.action, audit.entity, audit.entityId, audit.meta);

    return res.json({ success: true, data: result.data });
  }

  /**
   * GET /students/:id/scores
   */
  async getStudentScores(req: Request, res: Response) {
    const studentId = req.params.id;
    const { limit, offset } = req.query as unknown as ListStudentFeedbackQuery;

    const container = buildContainer();
    const scores = await container.feedback.listStudentScoresUseCase.execute(studentId as string, Number(limit), Number(offset));
    
    return res.json({ success: true, data: scores });
  }
}

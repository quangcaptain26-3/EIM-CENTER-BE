import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { ImportDataUseCase } from '../../../../application/system/usecases/import-data.usecase';
import {
  ExportDataUseCase,
  exportAsyncThreshold,
} from '../../../../application/system/usecases/export-data.usecase';
import { ExportJobPgRepo } from '../../../../infrastructure/db/repositories/system/export-job.pg.repo';
import { RunExportJobUseCase } from '../../../../application/system/usecases/run-export-job.usecase';
import { GetExportJobUseCase } from '../../../../application/system/usecases/get-export-job.usecase';
import { ImportType, ImportMode, ExportType } from '../../../../application/system/dtos/import-export.dto';
import { ERROR_CODES } from '../../../../shared/errors/error-codes';
import { AppError } from '../../../../shared/errors/app-error';

/** Tắt ETag/304 — trình duyệt cần body 200 để tải file (axios validateStatus < 300). */
function sendAttachment(
  res: Response,
  buffer: Buffer,
  contentType: string,
  filename: string,
): void {
  const safeName = filename.replace(/"/g, '');
  const encodedName = encodeURIComponent(safeName);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
  );
  res.status(200);
  res.removeHeader('ETag');
  res.send(buffer);
}

export function createImportExportController(
  importDataUseCase: ImportDataUseCase,
  exportDataUseCase: ExportDataUseCase,
  exportJobRepo: ExportJobPgRepo,
  runExportJobUseCase: RunExportJobUseCase,
  getExportJobUseCase: GetExportJobUseCase,
) {
  return {
    importData: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const type = req.params.type as ImportType;
        const mode = (req.query.mode as ImportMode) || 'preview';
        const actor = (req as { user?: { id: string; role: string } }).user;

        if (!req.file || !req.file.buffer) {
           res.status(400).json({
             code: ERROR_CODES.VALIDATION_ERROR,
             message: 'Missing Excel file',
           });
           return;
        }

        const result = await importDataUseCase.execute(type, req.file.buffer, mode, actor);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    exportData: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const type = req.params.type as ExportType;
        const filters = req.query as Record<string, unknown>;
        const actor = (req as { user?: { id: string; role: string } }).user;
        if (!actor?.id) {
          res.status(401).json({ code: ERROR_CODES.AUTH_TOKEN_INVALID, message: 'Unauthorized' });
          return;
        }

        const rowCount = await exportDataUseCase.countForExport(type, filters, actor);
        const threshold = exportAsyncThreshold();

        if (rowCount >= threshold) {
          const job = await exportJobRepo.create({
            exportType: type,
            filters,
            createdBy: actor.id,
            rowCount,
          });
          setImmediate(() => {
            void runExportJobUseCase.execute(job.id);
          });
          res.status(200).json({
            data: {
              jobId: job.id,
              status: 'processing',
              estimatedTime: Math.ceil(rowCount / 500),
            },
          });
          return;
        }

        const result = await exportDataUseCase.execute(type, filters, actor);
        sendAttachment(res, result.buffer, result.contentType, result.filename);
      } catch (err) {
        next(err);
      }
    },

    getExportJob: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const actor = (req as { user?: { id: string } }).user;
        if (!actor?.id) {
          res.status(401).json({ code: ERROR_CODES.AUTH_TOKEN_INVALID, message: 'Unauthorized' });
          return;
        }
        const result = await getExportJobUseCase.execute(String(req.params.jobId), actor.id);
        res.json({ data: result });
      } catch (err) {
        next(err);
      }
    },

    downloadExportJob: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const actor = (req as { user?: { id: string } }).user;
        if (!actor?.id) {
          res.status(401).json({ code: ERROR_CODES.AUTH_TOKEN_INVALID, message: 'Unauthorized' });
          return;
        }
        const job = await exportJobRepo.findByIdForUser(String(req.params.jobId), actor.id);
        if (!job || job.status !== 'done' || !job.filePath) {
          throw new AppError(ERROR_CODES.NOT_FOUND, 'File export chưa sẵn sàng', 404);
        }
        if (!fs.existsSync(job.filePath)) {
          throw new AppError(ERROR_CODES.NOT_FOUND, 'File export không tồn tại trên đĩa', 404);
        }
        const filename = path.basename(job.filePath);
        const ext = path.extname(filename).toLowerCase();
        const contentType =
          ext === '.csv'
            ? 'text/csv; charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        fs.createReadStream(job.filePath).pipe(res);
      } catch (err) {
        next(err);
      }
    },

    getTemplate: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const type = req.params.type as ImportType;
        const buffer = await importDataUseCase.getTemplate(type);

        sendAttachment(
          res,
          buffer,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          `template-${type}.xlsx`,
        );
      } catch (err) {
        next(err);
      }
    },
  };
}

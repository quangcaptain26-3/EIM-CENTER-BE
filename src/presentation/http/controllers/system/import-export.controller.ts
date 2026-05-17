import { Request, Response, NextFunction } from 'express';
import { ImportDataUseCase } from '../../../../application/system/usecases/import-data.usecase';
import { ExportDataUseCase } from '../../../../application/system/usecases/export-data.usecase';
import { ImportType, ImportMode, ExportType } from '../../../../application/system/dtos/import-export.dto';
import { ERROR_CODES } from '../../../../shared/errors/error-codes';

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
  res.set('ETag', false);
  res.send(buffer);
}

export function createImportExportController(
  importDataUseCase: ImportDataUseCase,
  exportDataUseCase: ExportDataUseCase,
) {
  return {
    importData: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const type = req.params.type as ImportType;
        const mode = (req.query.mode as ImportMode) || 'preview';
        const actor = (req as any).user;

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
        const filters = req.query;
        const actor = (req as any).user;

        const result = await exportDataUseCase.execute(type, filters, actor);
        sendAttachment(res, result.buffer, result.contentType, result.filename);
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

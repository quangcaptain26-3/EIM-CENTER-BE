import { Request, Response, NextFunction } from 'express';
import { ImportDataUseCase } from '../../../../application/system/usecases/import-data.usecase';
import { ExportDataUseCase } from '../../../../application/system/usecases/export-data.usecase';
import { ImportType, ImportMode, ExportType } from '../../../../application/system/dtos/import-export.dto';
import { ERROR_CODES } from '../../../../shared/errors/error-codes';

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

        const encodedName = encodeURIComponent(result.filename);
        res.setHeader('Content-Type', result.contentType);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${result.filename.replace(/"/g, '')}"; filename*=UTF-8''${encodedName}`,
        );
        res.send(result.buffer);
      } catch (err) {
        next(err);
      }
    },

    getTemplate: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const type = req.params.type as ImportType;
        const buffer = await importDataUseCase.getTemplate(type);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=template-${type}.xlsx`);
        res.send(buffer);
      } catch (err) {
        next(err);
      }
    },
  };
}

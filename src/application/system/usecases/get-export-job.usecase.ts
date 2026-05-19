import { ExportJobPgRepo } from '../../../infrastructure/db/repositories/system/export-job.pg.repo';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class GetExportJobUseCase {
  constructor(private readonly exportJobRepo: ExportJobPgRepo) {}

  async execute(jobId: string, userId: string) {
    const job = await this.exportJobRepo.findByIdForUser(jobId, userId);
    if (!job) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Không tìm thấy job export', 404);
    }

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      downloadUrl:
        job.status === 'done' && job.filePath
          ? `/export/jobs/${job.id}/download`
          : undefined,
      error: job.errorMessage ?? undefined,
    };
  }
}

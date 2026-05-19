import fs from 'fs/promises';
import path from 'path';
import { ExportDataUseCase } from './export-data.usecase';
import { ExportJobPgRepo } from '../../../infrastructure/db/repositories/system/export-job.pg.repo';
import { NotificationPgRepo } from '../../../infrastructure/db/repositories/system/notification.pg.repo';
import { UserPgRepo } from '../../../infrastructure/db/repositories/auth/user.pg.repo';

const EXPORT_DIR = path.join(process.cwd(), 'tmp', 'exports');

export class RunExportJobUseCase {
  constructor(
    private readonly exportJobRepo: ExportJobPgRepo,
    private readonly exportData: ExportDataUseCase,
    private readonly userRepo: UserPgRepo,
    private readonly notificationRepo: NotificationPgRepo,
  ) {}

  async execute(jobId: string): Promise<void> {
    const job = await this.exportJobRepo.findById(jobId);
    if (!job || job.status !== 'processing') return;

    const user = await this.userRepo.findById(job.createdBy);
    if (!user) {
      await this.exportJobRepo.markFailed(jobId, 'Không tìm thấy người dùng');
      return;
    }

    const actor = { id: user.id, role: user.role };

    try {
      const result = await this.exportData.execute(job.exportType, job.filters, actor);
      await fs.mkdir(EXPORT_DIR, { recursive: true });
      const ext = result.contentType.includes('csv') ? '.csv' : '.xlsx';
      const filePath = path.join(EXPORT_DIR, `${jobId}${ext}`);
      await fs.writeFile(filePath, result.buffer);

      const rowCount =
        job.rowCount ??
        (await this.exportData.countForExport(job.exportType, job.filters, actor));

      await this.exportJobRepo.markDone(jobId, filePath, rowCount);

      await this.notificationRepo.create({
        userId: job.createdBy,
        type: 'export.done',
        title: 'Xuất file hoàn tất',
        body: `File ${result.filename} đã sẵn sàng tải.`,
        metadata: { jobId, exportType: job.exportType, filename: result.filename },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export thất bại';
      await this.exportJobRepo.markFailed(jobId, message);
      await this.notificationRepo.create({
        userId: job.createdBy,
        type: 'export.failed',
        title: 'Xuất file thất bại',
        body: message,
        metadata: { jobId, exportType: job.exportType },
      });
    }
  }
}

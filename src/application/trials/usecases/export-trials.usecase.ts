import { TrialRepoPort } from "../../../domain/trials/repositories/trial.repo.port";
import { TrialsExporter } from "../../../infrastructure/excel/trials.exporter";
import type { Writable } from "stream";
import { ExportTrialsQuery, ExportTrialsSchema } from "../dtos/trial.dto";
import { AppError } from "../../../shared/errors/app-error";

export class ExportTrialsUseCase {
  private readonly MAX_EXPORT_ROWS = 5000;

  constructor(
    private readonly trialRepo: TrialRepoPort,
    private readonly trialsExporter: TrialsExporter,
  ) {}

  async execute(query: ExportTrialsQuery): Promise<Buffer> {
    const validated = ExportTrialsSchema.parse(query);

    // Export theo bộ lọc, lấy theo "limit" thay vì hardcode all.
    // (Tránh vô hạn dữ liệu trong trường hợp hệ thống đang có rất nhiều trial leads.)
    const leads = await this.trialRepo.list({
      search: validated.search,
      status: validated.status,
      limit: validated.limit,
      offset: 0,
    });

    if (leads.length > this.MAX_EXPORT_ROWS) {
      throw AppError.badRequest("Số trial leads xuất vượt ngưỡng an toàn", {
        code: "TRIALS_EXPORT/ROW_LIMIT_EXCEEDED",
        rowLimit: this.MAX_EXPORT_ROWS,
      });
    }

    return this.trialsExporter.exportTrials(leads);
  }

  async stream(query: ExportTrialsQuery, writable: Writable): Promise<void> {
    const validated = ExportTrialsSchema.parse(query);
    const leads = await this.trialRepo.list({
      search: validated.search,
      status: validated.status,
      limit: validated.limit,
      offset: 0,
    });

    if (leads.length > this.MAX_EXPORT_ROWS) {
      throw AppError.badRequest("Số trial leads xuất vượt ngưỡng an toàn", {
        code: "TRIALS_EXPORT/ROW_LIMIT_EXCEEDED",
        rowLimit: this.MAX_EXPORT_ROWS,
      });
    }

    await this.trialsExporter.streamTrials(leads, writable);
  }
}


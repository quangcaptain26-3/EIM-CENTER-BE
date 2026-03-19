import * as ExcelJS from "exceljs";
import type { Writable } from "stream";
import type { TrialLead } from "../../domain/trials/entities/trial-lead.entity";

export interface TrialExportRow {
  fullName: string;
  phone: string;
  email?: string | null;
  source?: string | null;
  status: string;
  note?: string | null;
  createdAt: Date;
}

export class TrialsExporter {
  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private buildWorkbook(trials: TrialLead[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();

    if (!trials || trials.length === 0) {
      const emptySheet = workbook.addWorksheet("No Data");
      emptySheet.addRow(["Không có dữ liệu cho điều kiện lọc này"]);
      return workbook;
    }

    const sheet = workbook.addWorksheet("Danh sách trial");
    sheet.columns = [
      { header: "STT", key: "stt", width: 6 },
      { header: "Họ tên", key: "fullName", width: 28 },
      { header: "SĐT", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 26 },
      { header: "Nguồn", key: "source", width: 18 },
      { header: "Trạng thái", key: "status", width: 14 },
      { header: "Ghi chú", key: "note", width: 30 },
      { header: "Ngày tạo", key: "createdAt", width: 14 },
    ];

    sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
    sheet.getRow(1).font = { bold: true };

    trials.forEach((t, idx) => {
      sheet.addRow({
        stt: idx + 1,
        fullName: t.fullName,
        phone: t.phone,
        email: t.email ?? "",
        source: t.source ?? "",
        status: t.status,
        note: t.note ?? "",
        createdAt: this.formatDate(t.createdAt),
      });
    });

    return workbook;
  }

  async exportTrials(trials: TrialLead[]): Promise<Buffer> {
    const workbook = this.buildWorkbook(trials);
    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async streamTrials(trials: TrialLead[], writable: Writable): Promise<void> {
    const workbook = this.buildWorkbook(trials);
    await workbook.xlsx.write(writable);
  }
}


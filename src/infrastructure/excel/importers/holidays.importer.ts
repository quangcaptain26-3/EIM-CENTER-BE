import ExcelJS from 'exceljs';
import { Pool } from 'pg';
import { BaseImporter, ImportError } from '../base-importer';

export interface HolidayImportRow {
  holidayDate: Date;
  name: string;
  isRecurring: boolean;
}

export class HolidaysImporter extends BaseImporter<HolidayImportRow> {
  constructor(private readonly db?: Pool) {
    super();
  }

  private parseDdMmYyyy(s: string): Date | null {
    const t = s.trim();
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) return null;
    const [dd, mm, yyyy] = t.split('/').map(Number);
    const d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
    return d;
  }

  private parseRecurring(raw: string | undefined): boolean | null {
    if (!raw || !raw.trim()) return false;
    const x = raw.trim().toLowerCase();
    if (['có', 'co', 'yes', 'y', 'true', '1', 'x'].includes(x)) return true;
    if (['không', 'khong', 'no', 'n', 'false', '0', ''].includes(x)) return false;
    return null;
  }

  async parse(buffer: Buffer): Promise<{ valid: HolidayImportRow[]; errors: ImportError[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    const valid: HolidayImportRow[] = [];
    const errors: ImportError[] = [];
    const seenDates = new Set<string>();

    const pending: Array<{ rowNumber: number; dateStr: string; name: string; recurring: boolean | null }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const dateStr = row.getCell(1).text?.trim() ?? '';
      const name = row.getCell(2).text?.trim() ?? '';
      const recRaw = row.getCell(3).text?.trim();

      if (!dateStr && !name) return;

      if (!dateStr) {
        errors.push({ row: rowNumber, field: 'Ngày (dd/mm/yyyy) (*)', reason: 'Bắt buộc nhập' });
        return;
      }
      if (!name) {
        errors.push({ row: rowNumber, field: 'Tên ngày lễ (*)', reason: 'Bắt buộc nhập' });
        return;
      }

      const recurring = this.parseRecurring(recRaw);
      if (recurring === null) {
        errors.push({ row: rowNumber, field: 'Lặp hàng năm (Có/Không)', reason: 'Giá trị không hợp lệ (Có/Không)' });
        return;
      }

      pending.push({ rowNumber, dateStr, name, recurring });
    });

    if (!this.db && pending.length > 0) {
      errors.push({ row: 0, field: 'config', reason: 'Thiếu kết nối DB để kiểm tra trùng ngày lễ' });
      return { valid: [], errors };
    }

    for (const p of pending) {
      const d = this.parseDdMmYyyy(p.dateStr);
      if (!d) {
        errors.push({ row: p.rowNumber, field: 'Ngày (dd/mm/yyyy) (*)', reason: 'Sai định dạng dd/mm/yyyy' });
        continue;
      }
      const key = d.toISOString().slice(0, 10);
      if (seenDates.has(key)) {
        errors.push({ row: p.rowNumber, field: 'Ngày (dd/mm/yyyy) (*)', reason: 'Trùng ngày trong file' });
        continue;
      }
      seenDates.add(key);

      const ex = await this.db!.query(`SELECT 1 FROM holidays WHERE holiday_date = $1::date`, [key]);
      if (ex.rowCount && ex.rowCount > 0) {
        errors.push({ row: p.rowNumber, field: 'Ngày (dd/mm/yyyy) (*)', reason: 'Ngày nghỉ đã tồn tại' });
        continue;
      }

      valid.push({
        holidayDate: d,
        name: p.name,
        isRecurring: p.recurring!,
      });
    }

    return { valid, errors };
  }

  async getTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Holidays');
    worksheet.columns = [
      { header: 'Ngày (dd/mm/yyyy) (*)', key: 'holidayDate', width: 22 },
      { header: 'Tên ngày lễ (*)', key: 'name', width: 35 },
      { header: 'Lặp hàng năm (Có/Không)', key: 'isRecurring', width: 26 },
    ];
    worksheet.addRow(['01/01/2026', 'Tết Dương lịch', 'Có']);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

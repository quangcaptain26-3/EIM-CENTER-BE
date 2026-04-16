import ExcelJS from 'exceljs';
import { BaseImporter, ImportError } from '../base-importer';

/** Khớp RecordAttendanceSchema (present | late | absent_excused | absent_unexcused) */
export type AttendanceStatusCode = 'present' | 'late' | 'absent_excused' | 'absent_unexcused';

export interface AttendanceImportRow {
  sessionId: string;
  studentCode: string;
  status: AttendanceStatusCode;
  note?: string;
  studentId: string;
  enrollmentId: string;
}

export type AttendanceValidatorFn = (sessionId: string, studentCode: string) => Promise<{
  isValid: boolean;
  reason?: string;
  studentId?: string;
  enrollmentId?: string;
}>;

export class AttendanceImporter extends BaseImporter<AttendanceImportRow> {
  constructor(private readonly validator?: AttendanceValidatorFn) {
    super();
  }

  async parse(buffer: Buffer): Promise<{ valid: AttendanceImportRow[]; errors: ImportError[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    const valid: AttendanceImportRow[] = [];
    const errors: ImportError[] = [];

    const rowsToCheck: Array<{ rowNumber: number; data: Omit<AttendanceImportRow, 'studentId' | 'enrollmentId'> }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const sessionId = row.getCell(1).text?.trim();
      const studentCode = row.getCell(2).text?.trim();
      let statusStr = row.getCell(3).text?.trim()?.toLowerCase();
      const note = row.getCell(4).text?.trim();

      if (!sessionId && !studentCode) return;

      if (!sessionId) {
        errors.push({ row: rowNumber, field: 'Mã buổi học (*)', reason: 'Bắt buộc nhập' });
        return;
      }
      if (!studentCode) {
        errors.push({ row: rowNumber, field: 'Mã học sinh (*)', reason: 'Bắt buộc nhập' });
        return;
      }

      let status: AttendanceStatusCode | undefined;
      if (statusStr) {
        if (['p', 'present', 'có mặt'].includes(statusStr)) status = 'present';
        else if (['l', 'late', 'đi muộn'].includes(statusStr)) status = 'late';
        else if (
          ['a', 'absent_excused', 'excused', 'nghỉ có phép'].includes(statusStr)
        ) {
          status = 'absent_excused';
        } else if (
          ['u', 'absent_unexcused', 'unexcused', 'nghỉ không phép'].includes(statusStr)
        ) {
          status = 'absent_unexcused';
        }
      }

      if (!status) {
        errors.push({
          row: rowNumber,
          field: 'Trạng thái (*)',
          reason: 'Không hợp lệ (P/L/A/U hoặc present/late/absent_excused/absent_unexcused)',
        });
        return;
      }

      rowsToCheck.push({
        rowNumber,
        data: { sessionId, studentCode, status, note },
      });
    });

    if (!this.validator) {
      for (const item of rowsToCheck) {
        errors.push({
          row: item.rowNumber,
          field: 'Cấu hình',
          reason: 'Import điểm danh cần validator (studentId/enrollmentId) — thiếu kết nối kiểm tra',
        });
      }
      return { valid, errors };
    }

    for (const item of rowsToCheck) {
      const check = await this.validator(item.data.sessionId, item.data.studentCode);
      if (!check.isValid || !check.studentId || !check.enrollmentId) {
        errors.push({
          row: item.rowNumber,
          field: 'Validation',
          reason: check.reason || 'Thiếu studentId/enrollmentId hoặc dữ liệu không khớp',
        });
      } else {
        valid.push({
          ...item.data,
          studentId: check.studentId,
          enrollmentId: check.enrollmentId,
        });
      }
    }

    return { valid, errors };
  }

  async getTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');
    worksheet.columns = [
      { header: 'Mã buổi học (*)', key: 'sessionId', width: 40 },
      { header: 'Mã học sinh (*)', key: 'studentCode', width: 20 },
      { header: 'Trạng thái (*)', key: 'status', width: 20 },
      { header: 'Ghi chú', key: 'note', width: 30 },
    ];
    worksheet.addRow(['(ID buổi học UUID)', 'EIM-HS-00001', 'P/L/A/U', 'Ghi chú thêm...']);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

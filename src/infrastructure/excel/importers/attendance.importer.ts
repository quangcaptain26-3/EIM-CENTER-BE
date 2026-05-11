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

// Checklist format: classCode, sessionNo, studentCode, status, note
export type AttendanceValidatorFn = (
  classCode: string,
  sessionNo: number,
  studentCode: string,
) => Promise<{
  isValid: boolean;
  reason?: string;
  studentId?: string;
  enrollmentId?: string;
  sessionId?: string;
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

    const rowsToCheck: Array<{
      rowNumber: number;
      data: {
        classCode: string;
        sessionNo: number;
        studentCode: string;
        status: AttendanceStatusCode;
        note?: string;
      };
    }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const classCode = row.getCell(1).text?.trim();
      const sessionNoRaw = row.getCell(2).value;
      const studentCode = row.getCell(3).text?.trim();
      let statusStr = row.getCell(4).text?.trim()?.toLowerCase();
      const note = row.getCell(5).text?.trim();

      const sessionNo =
        typeof sessionNoRaw === 'number'
          ? sessionNoRaw
          : parseInt(String(sessionNoRaw ?? ''), 10);

      if (!classCode && !studentCode) return;

      if (!classCode) {
        errors.push({ row: rowNumber, field: 'Mã lớp (*)', reason: 'Bắt buộc nhập' });
        return;
      }
      if (!studentCode) {
        errors.push({ row: rowNumber, field: 'Mã học sinh (*)', reason: 'Bắt buộc nhập' });
        return;
      }
      if (!Number.isFinite(sessionNo) || sessionNo <= 0) {
        errors.push({ row: rowNumber, field: 'Buổi số (*)', reason: 'Số buổi không hợp lệ' });
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
        data: { classCode, sessionNo, studentCode, status, note },
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
      const check = await this.validator(item.data.classCode, item.data.sessionNo, item.data.studentCode);
      if (!check.isValid || !check.studentId || !check.enrollmentId || !check.sessionId) {
        errors.push({
          row: item.rowNumber,
          field: 'Validation',
          reason: check.reason || 'Thiếu sessionId/studentId/enrollmentId hoặc dữ liệu không khớp',
        });
      } else {
        valid.push({
          sessionId: check.sessionId,
          studentId: check.studentId,
          enrollmentId: check.enrollmentId,
          studentCode: item.data.studentCode,
          status: item.data.status,
          note: item.data.note,
        });
      }
    }

    return { valid, errors };
  }

  async getTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');
    worksheet.columns = [
      { header: 'Mã lớp (*)', key: 'classCode', width: 20 },
      { header: 'Buổi số (*)', key: 'sessionNo', width: 12 },
      { header: 'Mã học sinh (*)', key: 'studentCode', width: 20 },
      { header: 'Trạng thái (*)', key: 'status', width: 20 },
      { header: 'Ghi chú', key: 'note', width: 30 },
    ];
    worksheet.addRow(['EIM-LS-01', 1, 'EIM-HS-00001', 'P/L/A/U', 'Ghi chú thêm...']);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

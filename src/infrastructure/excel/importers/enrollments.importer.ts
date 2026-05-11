import ExcelJS from 'exceljs';
import { Pool } from 'pg';
import { BaseImporter, ImportError } from '../base-importer';

export interface EnrollmentImportRow {
  studentCode: string;
  classCode: string;
  /** Đã resolve, dùng khi commit */
  studentId: string;
  classId: string;
  tuitionFee: number;
}

export class EnrollmentsImporter extends BaseImporter<EnrollmentImportRow> {
  constructor(private readonly db?: Pool) {
    super();
  }

  async parse(buffer: Buffer): Promise<{ valid: EnrollmentImportRow[]; errors: ImportError[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    const valid: EnrollmentImportRow[] = [];
    const errors: ImportError[] = [];

    const rows: Array<{ rowNumber: number; studentCode: string; classCode: string; feeRaw?: string }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const studentCode = row.getCell(1).text?.trim();
      const classCode = row.getCell(2).text?.trim();
      const feeRaw = row.getCell(3).text?.trim();

      if (!studentCode && !classCode) return;

      if (!studentCode) {
        errors.push({ row: rowNumber, field: 'Mã học viên (*)', reason: 'Bắt buộc nhập' });
        return;
      }
      if (!classCode) {
        errors.push({ row: rowNumber, field: 'Mã lớp (*)', reason: 'Bắt buộc nhập' });
        return;
      }

      rows.push({ rowNumber, studentCode, classCode, feeRaw });
    });

    if (!this.db) {
      errors.push({ row: 0, field: 'config', reason: 'Thiếu kết nối DB để kiểm tra ghi danh' });
      return { valid, errors };
    }

    for (const r of rows) {
      const { rowNumber, studentCode, classCode, feeRaw } = r;

      const stRes = await this.db.query(
        `SELECT id FROM students WHERE student_code = $1 AND deleted_at IS NULL`,
        [studentCode],
      );
      if (!stRes.rows[0]) {
        errors.push({ row: rowNumber, field: 'Mã học viên (*)', reason: 'Không tìm thấy học viên' });
        continue;
      }
      const studentId = stRes.rows[0].id as string;

      const clRes = await this.db.query(
        `SELECT c.id, c.status, c.max_capacity FROM classes c WHERE c.class_code = $1`,
        [classCode],
      );
      if (!clRes.rows[0]) {
        errors.push({ row: rowNumber, field: 'Mã lớp (*)', reason: 'Không tìm thấy lớp' });
        continue;
      }
      const cls = clRes.rows[0] as { id: string; status: string; max_capacity: number };
      if (!['pending', 'active'].includes(cls.status)) {
        errors.push({ row: rowNumber, field: 'Mã lớp (*)', reason: 'Lớp không ở trạng thái nhận học viên (pending/active)' });
        continue;
      }

      const activeEnr = await this.db.query(
        `SELECT 1 FROM enrollments WHERE student_id = $1 AND status IN ('trial','active','paused') LIMIT 1`,
        [studentId],
      );
      if (activeEnr.rowCount && activeEnr.rowCount > 0) {
        errors.push({ row: rowNumber, field: 'Mã học viên (*)', reason: 'Học viên đang có ghi danh đang hiệu lực' });
        continue;
      }

      const cntRes = await this.db.query(
        `SELECT COUNT(*)::int AS n FROM enrollments WHERE class_id = $1 AND status IN ('trial','active')`,
        [cls.id],
      );
      const activeInClass = Number(cntRes.rows[0]?.n ?? 0);
      if (activeInClass >= cls.max_capacity) {
        errors.push({ row: rowNumber, field: 'Mã lớp (*)', reason: 'Lớp đã đủ sĩ số' });
        continue;
      }

      let tuitionFee: number | undefined;
      if (feeRaw) {
        const normalized = feeRaw.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
        const n = Number(normalized);
        if (Number.isNaN(n) || n < 0) {
          errors.push({ row: rowNumber, field: 'Học phí', reason: 'Số không hợp lệ' });
          continue;
        }
        tuitionFee = n;
      }

      const progRes = await this.db.query(
        `SELECT p.default_fee FROM classes c JOIN programs p ON p.id = c.program_id WHERE c.id = $1`,
        [cls.id],
      );
      const defaultFee = Number(progRes.rows[0]?.default_fee ?? 0);
      const fee = tuitionFee ?? defaultFee;

      valid.push({
        studentCode,
        classCode,
        studentId,
        classId: cls.id,
        tuitionFee: fee,
      });
    }

    return { valid, errors };
  }

  async getTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Enrollments');
    worksheet.columns = [
      { header: 'Mã học viên (*)', key: 'studentCode', width: 18 },
      { header: 'Mã lớp (*)', key: 'classCode', width: 18 },
      { header: 'Học phí (tùy chọn)', key: 'tuitionFee', width: 16 },
    ];
    worksheet.addRow(['EIM-HS-00001', 'EIM-L-001', '']);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

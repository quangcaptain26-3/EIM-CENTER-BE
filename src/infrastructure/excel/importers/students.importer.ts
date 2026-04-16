import ExcelJS from 'exceljs';
import { BaseImporter, ImportError } from '../base-importer';
import { Pool } from 'pg';

export interface StudentImportRow {
  stt: number;
  fullName: string;
  dob?: Date;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  parentName: string;
  parentPhone: string;
  parentPhone2?: string;
  parentZalo?: string;
  schoolName?: string;
  address?: string;
}

export class StudentsImporter extends BaseImporter<StudentImportRow> {
  constructor(private readonly db?: Pool) {
    super();
  }

  async parse(buffer: Buffer): Promise<{ valid: StudentImportRow[]; errors: ImportError[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    
    const worksheet = workbook.worksheets[0];
    const valid: StudentImportRow[] = [];
    const errors: ImportError[] = [];

    // Assuming row 1 is header
    // STT, Họ và tên (*), Ngày sinh, Giới tính, Tên phụ huynh (*), SĐT phụ huynh (*), SĐT 2, Zalo, Trường, Địa chỉ
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const _stt = row.getCell(1).value as number;
      const fullName = row.getCell(2).text?.trim();
      const dobStr = row.getCell(3).text?.trim();
      const genderStr = row.getCell(4).text?.trim()?.toLowerCase();
      const parentName = row.getCell(5).text?.trim();
      const parentPhone = row.getCell(6).text?.trim();
      const parentPhone2 = row.getCell(7).text?.trim();
      const parentZalo = row.getCell(8).text?.trim();
      const schoolName = row.getCell(9).text?.trim();
      const address = row.getCell(10).text?.trim();

      if (!fullName && !parentName && !parentPhone) return; // skip empty rows

      if (!fullName) {
        errors.push({ row: rowNumber, field: 'Họ và tên (*)', reason: 'Bắt buộc nhập' });
        return;
      }
      if (!parentName) {
        errors.push({ row: rowNumber, field: 'Tên phụ huynh (*)', reason: 'Bắt buộc nhập' });
        return;
      }
      if (!parentPhone || !/^\d{10,11}$/.test(parentPhone)) {
        errors.push({ row: rowNumber, field: 'SĐT phụ huynh (*)', reason: 'SĐT không hợp lệ (10-11 số)' });
        return;
      }

      let dob: Date | undefined;
      if (dobStr) {
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dobStr)) {
          const [day, month, year] = dobStr.split('/').map(Number);
          dob = new Date(year, month - 1, day);
        } else {
          errors.push({ row: rowNumber, field: 'Ngày sinh', reason: 'Sai định dạng dd/mm/yyyy' });
          return;
        }
      }

      let gender: 'Nam' | 'Nữ' | 'Khác' | undefined;
      if (genderStr) {
        if (['nam', 'male'].includes(genderStr)) gender = 'Nam';
        else if (['nữ', 'nu', 'female'].includes(genderStr)) gender = 'Nữ';
        else gender = 'Khác';
      }

      valid.push({
        stt: _stt || valid.length + 1,
        fullName,
        dob,
        gender,
        parentName,
        parentPhone,
        parentPhone2,
        parentZalo,
        schoolName,
        address,
      });
    });

    // Check existing records safely
    if (this.db) {
      const validFiltered: StudentImportRow[] = [];
      for (const row of valid) {
        try {
          const { rowCount } = await this.db.query('SELECT 1 FROM students WHERE parent_phone = $1 LIMIT 1', [row.parentPhone]);
          if (rowCount && rowCount > 0) {
            errors.push({ row: row.stt + 1, field: 'SĐT phụ huynh (*)', reason: 'Bản ghi đã tồn tại (trùng SĐT)' });
          } else {
            validFiltered.push(row);
          }
        } catch (err) {
          validFiltered.push(row);
        }
      }
      return { valid: validFiltered, errors };
    }

    return { valid, errors };
  }

  async getTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');
    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'Họ và tên (*)', key: 'fullName', width: 25 },
      { header: 'Ngày sinh (dd/mm/yyyy)', key: 'dob', width: 20 },
      { header: 'Giới tính (Nam/Nữ)', key: 'gender', width: 15 },
      { header: 'Tên phụ huynh (*)', key: 'parentName', width: 25 },
      { header: 'SĐT phụ huynh (*)', key: 'parentPhone', width: 20 },
      { header: 'SĐT 2', key: 'parentPhone2', width: 20 },
      { header: 'Zalo', key: 'parentZalo', width: 20 },
      { header: 'Trường', key: 'schoolName', width: 25 },
      { header: 'Địa chỉ', key: 'address', width: 30 },
    ];
    // Write the workbook to a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

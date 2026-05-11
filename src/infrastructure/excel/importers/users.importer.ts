import ExcelJS from 'exceljs';
import { BaseImporter, ImportError } from '../base-importer';

export interface UserImportRow {
  fullName: string;
  email: string;
  roleCode: string;
  phone?: string;
  cccd?: string;
  dob?: Date;
  educationLevel?: string;
  major?: string;
  startDate?: Date;
  salaryPerSession?: number;
}

export class UsersImporter extends BaseImporter<UserImportRow> {
  constructor(private readonly existingEmails: string[] = []) {
    super();
  }

  async parse(buffer: Buffer): Promise<{ valid: UserImportRow[]; errors: ImportError[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    
    const worksheet = workbook.worksheets[0];
    const valid: UserImportRow[] = [];
    const errors: ImportError[] = [];

    // Columns: Họ tên (*), Email (*), Vai trò (*), SĐT, CCCD, Ngày sinh, Trình độ, Chuyên ngành, Ngày vào làm, Lương/buổi
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const fullName = row.getCell(1).text?.trim();
      const email = row.getCell(2).text?.trim();
      const roleStr = row.getCell(3).text?.trim()?.toUpperCase();
      const phone = row.getCell(4).text?.trim();
      const cccd = row.getCell(5).text?.trim();
      const dobStr = row.getCell(6).text?.trim();
      const educationLevel = row.getCell(7).text?.trim();
      const major = row.getCell(8).text?.trim();
      const startDateStr = row.getCell(9).text?.trim();
      const salaryStr = row.getCell(10).value as string | number;

      if (!fullName && !email) return;

      if (!fullName) {
        errors.push({ row: rowNumber, field: 'Họ tên (*)', reason: 'Bắt buộc nhập' });
        return;
      }
      if (!email) {
        errors.push({ row: rowNumber, field: 'Email (*)', reason: 'Bắt buộc nhập' });
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({ row: rowNumber, field: 'Email (*)', reason: 'Không đúng định dạng' });
        return;
      }
      
      if (this.existingEmails.includes(email)) {
        errors.push({ row: rowNumber, field: 'Email (*)', reason: 'Email đã tồn tại' });
        return;
      }

      if (!roleStr || !['ADMIN', 'ACADEMIC', 'ACCOUNTANT', 'TEACHER'].includes(roleStr)) {
        errors.push({ row: rowNumber, field: 'Vai trò (*)', reason: 'Không hợp lệ (ADMIN/ACADEMIC/ACCOUNTANT/TEACHER)' });
        return;
      }

      let salaryPerSession: number | undefined;
      if (roleStr === 'TEACHER') {
        const parsed = Number(salaryStr);
        if (salaryStr === undefined || salaryStr === null || isNaN(parsed) || parsed <= 0) {
          errors.push({ row: rowNumber, field: 'Lương/buổi', reason: 'GV bắt buộc có lương > 0' });
          return;
        }
        salaryPerSession = parsed;
      }

      let dob: Date | undefined;
      if (dobStr && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dobStr)) {
        const [day, month, year] = dobStr.split('/').map(Number);
        dob = new Date(year, month - 1, day);
      }

      let startDate: Date | undefined;
      if (startDateStr && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(startDateStr)) {
        const [day, month, year] = startDateStr.split('/').map(Number);
        startDate = new Date(year, month - 1, day);
      } else if (startDateStr) {
         // fallback if it's parsed as Date object natively
         const testDate = new Date(startDateStr);
         if (!isNaN(testDate.getTime())) startDate = testDate;
      }

      valid.push({
        fullName,
        email,
        roleCode: roleStr,
        phone,
        cccd,
        dob,
        educationLevel,
        major,
        startDate,
        salaryPerSession,
      });
    });

    return { valid, errors };
  }

  async getTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');
    worksheet.columns = [
      { header: 'Họ tên (*)', key: 'fullName', width: 25 },
      { header: 'Email (*)', key: 'email', width: 30 },
      { header: 'Vai trò (*)', key: 'roleCode', width: 15 },
      { header: 'SĐT', key: 'phone', width: 20 },
      { header: 'CCCD', key: 'cccd', width: 20 },
      { header: 'Ngày sinh (dd/mm/yyyy)', key: 'dob', width: 20 },
      { header: 'Trình độ', key: 'educationLevel', width: 20 },
      { header: 'Chuyên ngành', key: 'major', width: 20 },
      { header: 'Ngày vào làm (dd/mm/yyyy)', key: 'startDate', width: 20 },
      { header: 'Lương/buổi (VNĐ)', key: 'salaryPerSession', width: 20 },
    ];
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

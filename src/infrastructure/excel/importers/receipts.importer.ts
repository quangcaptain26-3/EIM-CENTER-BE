import ExcelJS from 'exceljs';
import { Pool } from 'pg';
import { BaseImporter, ImportError } from '../base-importer';

export interface ReceiptImportRow {
  studentId: string;
  enrollmentId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'transfer';
  reason: string;
  payerName: string;
}

export class ReceiptsImporter extends BaseImporter<ReceiptImportRow> {
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

  async parse(buffer: Buffer): Promise<{ valid: ReceiptImportRow[]; errors: ImportError[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    const valid: ReceiptImportRow[] = [];
    const errors: ImportError[] = [];

    if (!this.db) {
      errors.push({ row: 0, field: 'config', reason: 'Thiếu kết nối DB để kiểm tra phiếu thu' });
      return { valid, errors };
    }

    const rows: Array<{
      rowNumber: number;
      studentCode: string;
      enrollmentIdRaw: string;
      amountRaw: string;
      dateRaw: string;
      methodRaw: string;
      reason: string;
      payerName: string;
    }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      rows.push({
        rowNumber,
        studentCode: row.getCell(1).text?.trim() ?? '',
        enrollmentIdRaw: row.getCell(2).text?.trim() ?? '',
        amountRaw: row.getCell(3).text?.trim() ?? '',
        dateRaw: row.getCell(4).text?.trim() ?? '',
        methodRaw: (row.getCell(5).text?.trim() ?? '').toLowerCase(),
        reason: row.getCell(6).text?.trim() ?? '',
        payerName: row.getCell(7).text?.trim() ?? '',
      });
    });

    for (const r of rows) {
      const { rowNumber, studentCode, enrollmentIdRaw, amountRaw, dateRaw, methodRaw } = r;
      let reason = r.reason;
      let payerName = r.payerName;

      if (!studentCode && !enrollmentIdRaw && !amountRaw && !dateRaw && !methodRaw && !reason && !payerName) {
        continue;
      }

      if (!studentCode) {
        errors.push({ row: rowNumber, field: 'Mã học viên (*)', reason: 'Bắt buộc nhập' });
        continue;
      }
      if (!enrollmentIdRaw) {
        errors.push({ row: rowNumber, field: 'Mã enrollment (*)', reason: 'Bắt buộc nhập' });
        continue;
      }
      if (!amountRaw) {
        errors.push({ row: rowNumber, field: 'Số tiền (*)', reason: 'Bắt buộc nhập' });
        continue;
      }
      if (!dateRaw) {
        errors.push({ row: rowNumber, field: 'Ngày thu (*)', reason: 'Bắt buộc nhập' });
        continue;
      }

      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(enrollmentIdRaw)) {
        errors.push({ row: rowNumber, field: 'Mã enrollment (*)', reason: 'Phải là UUID hợp lệ' });
        continue;
      }

      const normalized = amountRaw.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
      const amount = Number(normalized);
      if (Number.isNaN(amount) || amount === 0) {
        errors.push({ row: rowNumber, field: 'Số tiền (*)', reason: 'Số tiền phải khác 0' });
        continue;
      }

      const payDate = this.parseDdMmYyyy(dateRaw);
      if (!payDate) {
        errors.push({ row: rowNumber, field: 'Ngày thu (*)', reason: 'Sai định dạng dd/mm/yyyy' });
        continue;
      }

      let paymentMethod: 'cash' | 'transfer';
      if (['cash', 'tiền mặt', 'tien mat', 'tm'].includes(methodRaw)) paymentMethod = 'cash';
      else if (['transfer', 'chuyển khoản', 'chuyen khoan', 'ck'].includes(methodRaw)) paymentMethod = 'transfer';
      else {
        errors.push({ row: rowNumber, field: 'Hình thức', reason: 'Chỉ chấp nhận cash hoặc transfer' });
        continue;
      }

      if (!reason) reason = 'Thu học phí (import)';
      if (!payerName) payerName = 'Người nộp (import)';

      const stRes = await this.db.query(
        `SELECT id FROM students WHERE student_code = $1 AND deleted_at IS NULL`,
        [studentCode],
      );
      if (!stRes.rows[0]) {
        errors.push({ row: rowNumber, field: 'Mã học viên (*)', reason: 'Không tìm thấy học viên' });
        continue;
      }
      const studentId = stRes.rows[0].id as string;

      const enRes = await this.db.query(`SELECT student_id FROM enrollments WHERE id = $1`, [enrollmentIdRaw]);
      if (!enRes.rows[0]) {
        errors.push({ row: rowNumber, field: 'Mã enrollment (*)', reason: 'Không tìm thấy ghi danh' });
        continue;
      }
      if ((enRes.rows[0].student_id as string) !== studentId) {
        errors.push({ row: rowNumber, field: 'Mã học viên (*)', reason: 'Không khớp với học viên của ghi danh' });
        continue;
      }

      valid.push({
        studentId,
        enrollmentId: enrollmentIdRaw,
        amount,
        paymentDate: payDate,
        paymentMethod,
        reason,
        payerName,
      });
    }

    return { valid, errors };
  }

  async getTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Receipts');
    worksheet.columns = [
      { header: 'Mã học viên (*)', key: 'studentCode', width: 18 },
      { header: 'Mã enrollment (*)', key: 'enrollmentId', width: 40 },
      { header: 'Số tiền (*)', key: 'amount', width: 14 },
      { header: 'Ngày thu (*)', key: 'paymentDate', width: 18 },
      { header: 'Hình thức (cash/transfer)', key: 'paymentMethod', width: 24 },
      { header: 'Lý do', key: 'reason', width: 28 },
      { header: 'Tên người nộp', key: 'payerName', width: 28 },
    ];
    worksheet.addRow(['EIM-HS-00001', '(UUID enrollment)', '5000000', '15/03/2026', 'cash', 'Học phí tháng 3', 'Nguyễn Văn A']);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

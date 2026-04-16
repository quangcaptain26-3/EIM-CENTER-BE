import ExcelJS from 'exceljs';

export interface ClassRosterExportRow {
  studentCode: string;
  fullName: string;
  dob: Date | string | null;
  parentName: string | null;
  parentPhone: string | null;
  sessionsAttended: number;
  debt: number;
}

export class ClassRosterExporter {
  async export(classCode: string, rows: ClassRosterExportRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Lớp ${classCode}`);

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã HS', key: 'studentCode', width: 14 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'Ngày sinh', key: 'dob', width: 14 },
      { header: 'Phụ huynh', key: 'parentName', width: 26 },
      { header: 'SĐT', key: 'parentPhone', width: 14 },
      { header: 'Buổi đã học', key: 'sessionsAttended', width: 14 },
      { header: 'Công nợ', key: 'debt', width: 16 },
    ];

    rows.forEach((r, i) => {
      worksheet.addRow({
        stt: i + 1,
        studentCode: r.studentCode,
        fullName: r.fullName,
        dob: r.dob ? new Date(r.dob).toLocaleDateString('vi-VN') : '',
        parentName: r.parentName ?? '',
        parentPhone: r.parentPhone ?? '',
        sessionsAttended: r.sessionsAttended,
        debt: Number(r.debt) || 0,
      });
    });

    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

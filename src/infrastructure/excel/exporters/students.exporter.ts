import ExcelJS from 'exceljs';

export class StudentsExporter {
  async export(students: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách học viên');

    worksheet.columns = [
      { header: 'Mã HS', key: 'studentCode', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'Ngày sinh', key: 'dob', width: 15 },
      { header: 'Phụ huynh', key: 'parentName', width: 25 },
      { header: 'SĐT', key: 'parentPhone', width: 15 },
      { header: 'Lớp', key: 'className', width: 20 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Công nợ', key: 'debt', width: 15 },
    ];

    for (const s of students) {
      worksheet.addRow({
        studentCode: s.studentCode,
        fullName: s.fullName,
        dob: s.dob ? new Date(s.dob).toLocaleDateString('vi-VN') : '',
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        className: s.activeEnrollment?.classCode || '',
        status: s.activeEnrollment?.status || '',
        debt: s.debt || 0,
      });
    }

    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

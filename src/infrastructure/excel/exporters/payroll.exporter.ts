import ExcelJS from 'exceljs';

export class PayrollExporter {
  async export(payroll: any, sessionDetails: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1 "Tổng hợp"
    const sheet1 = workbook.addWorksheet('Tổng hợp');
    sheet1.columns = [
      { header: 'Tên GV', key: 'teacherName', width: 25 },
      { header: 'Mã', key: 'teacherCode', width: 15 },
      { header: 'Tháng', key: 'month', width: 15 },
      { header: 'Tổng buổi', key: 'totalSessions', width: 15 },
      { header: 'Lương/buổi', key: 'salaryPerSession', width: 15 },
      { header: 'Phụ cấp', key: 'allowance', width: 15 },
      { header: 'Tổng lương', key: 'totalSalary', width: 20 },
    ];
    
    sheet1.addRow({
      teacherName: payroll.teacherName,
      teacherCode: payroll.teacherCode,
      month: payroll.periodMonth,
      totalSessions: payroll.totalSessionsVal,
      salaryPerSession: payroll.salaryPerSession,
      allowance: payroll.allowance,
      totalSalary: payroll.totalSalary,
    });
    sheet1.getRow(1).font = { bold: true };

    // Sheet 2 "Chi tiết"
    const sheet2 = workbook.addWorksheet('Chi tiết');
    sheet2.columns = [
      { header: 'Ngày', key: 'date', width: 15 },
      { header: 'Lớp', key: 'classCode', width: 20 },
      { header: 'Loại', key: 'type', width: 15 },
    ];

    for (const session of sessionDetails) {
      sheet2.addRow({
        date: session.date ? new Date(session.date).toLocaleDateString('vi-VN') : '',
        classCode: session.classCode,
        type: session.isCover ? 'Cover' : 'Chính',
      });
    }
    sheet2.getRow(1).font = { bold: true };

    // Header/Footer could be added via header/footer properties if needed for printing
    sheet1.headerFooter.oddHeader = '&RNgày xuất: &D';
    sheet1.headerFooter.oddFooter = '&LChữ ký GV&RChữ ký kế toán';
    sheet2.headerFooter.oddHeader = '&RNgày xuất: &D';
    sheet2.headerFooter.oddFooter = '&LChữ ký GV&RChữ ký kế toán';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

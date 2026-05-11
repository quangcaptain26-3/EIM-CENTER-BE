import ExcelJS from 'exceljs';

export class DebtReportExporter {
  async export(enrollmentsWithDebt: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo công nợ');

    worksheet.columns = [
      { header: 'Mã HS', key: 'studentCode', width: 15 },
      { header: 'Tên HS', key: 'studentName', width: 25 },
      { header: 'Lớp', key: 'classCode', width: 20 },
      { header: 'Số tiền nợ', key: 'debt', width: 20 },
      { header: 'Phụ huynh', key: 'parentName', width: 25 },
      { header: 'SĐT', key: 'parentPhone', width: 15 },
    ];

    // Sort by debt DESC
    const sorted = [...enrollmentsWithDebt].sort((a, b) => Number(b.debt || 0) - Number(a.debt || 0));

    let totalDebt = 0;

    for (const e of sorted) {
      const debtVal = Number(e.debt || 0);
      if (debtVal <= 0) continue; // Only show positive debt
      totalDebt += debtVal;

      worksheet.addRow({
        studentCode: e.studentCode,
        studentName: e.studentName,
        classCode: e.classCode,
        debt: debtVal,
        parentName: e.parentName,
        parentPhone: e.parentPhone,
      });
    }

    worksheet.getRow(1).font = { bold: true };
    
    // Add total row
    const totalRow = worksheet.addRow({
      classCode: 'TỔNG CỘNG',
      debt: totalDebt,
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

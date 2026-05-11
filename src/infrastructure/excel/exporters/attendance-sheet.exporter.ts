import ExcelJS from 'exceljs';

/** Màu nền ô theo Q41 / EIM_QA — P/L/A/U dễ đọc trên file pivot. */
const CELL_FILLS: Record<string, ExcelJS.Fill> = {
  P: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } },
  L: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } },
  A: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } },
  U: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } },
};

export class AttendanceSheetExporter {
  async export(
    classCode: string,
    students: any[],
    sessions: any[],
    attendanceMap: Record<string, Record<string, string>>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Điểm danh ${classCode}`);

    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'Mã HS', key: 'studentCode', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
    ];

    for (const session of sessions) {
      const dateStr = session.date ? new Date(session.date).toLocaleDateString('vi-VN') : session.sessionNumber;
      columns.push({
        header: `B${session.sessionNumber} (${dateStr})`,
        key: `session_${session.id}`,
        width: 14,
      });
    }

    worksheet.columns = columns;

    students.forEach((s, i) => {
      const row: Record<string, unknown> = {
        stt: i + 1,
        studentCode: s.studentCode,
        fullName: s.fullName,
      };

      for (const session of sessions) {
        const key = `session_${session.id}`;
        const status = attendanceMap[s.id]?.[session.id];

        let display = '';
        if (status === 'present') display = 'P';
        else if (status === 'late') display = 'L';
        else if (status === 'absent_excused') display = 'A';
        else if (status === 'absent_unexcused' || status === 'unexcused') display = 'U';

        row[key] = display;
      }

      worksheet.addRow(row);
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const lastCol = 3 + sessions.length;
    const lastRow = students.length + 1;

    for (let r = 2; r <= lastRow; r++) {
      const row = worksheet.getRow(r);
      for (let c = 4; c <= lastCol; c++) {
        const cell = row.getCell(c);
        const v = String(cell.value ?? '').trim();
        const fill = CELL_FILLS[v];
        if (fill && v) {
          cell.fill = fill;
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }

    worksheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 3, topLeftCell: 'D2' }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

import ExcelJS from 'exceljs';

export class AttendanceSheetExporter {
  async export(classCode: string, students: any[], sessions: any[], attendanceMap: Record<string, Record<string, string>>): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Điểm danh ${classCode}`);

    // Columns: STT, Mã HS, Họ tên, then each session Date
    const columns: any[] = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'Mã HS', key: 'studentCode', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
    ];

    for (const session of sessions) {
      const dateStr = session.date ? new Date(session.date).toLocaleDateString('vi-VN') : session.sessionNumber;
      columns.push({ header: `B${session.sessionNumber} (${dateStr})`, key: `session_${session.id}`, width: 15 });
    }

    worksheet.columns = columns;

    students.forEach((s, i) => {
      const row: any = {
        stt: i + 1,
        studentCode: s.studentCode,
        fullName: s.fullName,
      };

      for (const session of sessions) {
        const key = `session_${session.id}`;
        const status = attendanceMap[s.id]?.[session.id];
        
        // P (present) | L (late) | A (absent_excused) | U (unexcused)
        let display = '';
        if (status === 'present') display = 'P';
        else if (status === 'late') display = 'L';
        else if (status === 'absent_excused') display = 'A';
        else if (status === 'absent_unexcused' || status === 'unexcused') display = 'U';

        row[key] = display;
      }

      worksheet.addRow(row);
    });

    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

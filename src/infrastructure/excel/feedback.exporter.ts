import * as ExcelJS from 'exceljs';
import type { Writable } from "stream";
import {
  FEEDBACK_EXCEL_COLUMNS,
  FEEDBACK_EXCEL_SHEET_NAME,
  FEEDBACK_HEADERS_VI,
  FeedbackExcelColumnKey,
} from './feedback-excel.contract';

export interface StudentFeedbackForExport {
  studentId: string;
  studentName: string;
  attendance?: string | null;
  homework?: string | null;
  participation?: string | null;
  behavior?: string | null;
  comment?: string | null;
}

export interface SessionFeedbackExport {
  sessionId: string;
  sessionDate: Date;
  feedbacks: StudentFeedbackForExport[];
}

/**
 * Dữ liệu nguồn để build từng dòng template cho một buổi học.
 * UseCase chịu trách nhiệm map từ Entity/Domain sang cấu trúc này.
 */
export interface SessionFeedbackTemplateRowInput {
  sessionId: string;
  sessionDate: Date;
  sessionType: string;
  classCode: string;
  studentId: string;
  studentName: string;
  attendance?: string | null;
  homework?: string | null;
  participation?: string | null;
  behavior?: string | null;
  languageUsage?: string | null;
  comment?: string | null;
  // Các trường điểm số chỉ dùng cho báo cáo (report); template có thể để trống
  scoreListening?: number | null;
  scoreReading?: number | null;
  scoreWriting?: number | null;
  scoreSpeaking?: number | null;
  scoreTotal?: number | null;
  scoreNote?: string | null;
}

export class FeedbackExporter {
  private buildSessionTemplateWorkbook(rows: SessionFeedbackTemplateRowInput[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(FEEDBACK_EXCEL_SHEET_NAME);

    this.configureTemplateHeader(sheet);

    const excelRows = this.buildTemplateRows(rows, { includeScores: false });
    excelRows.forEach((row) => {
      sheet.addRow(row);
    });

    this.applyAutoWidth(sheet);
    return workbook;
  }

  private buildSessionFeedbackReportWorkbook(rows: SessionFeedbackTemplateRowInput[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(FEEDBACK_EXCEL_SHEET_NAME);

    this.configureTemplateHeader(sheet);

    const excelRows = this.buildTemplateRows(rows, { includeScores: true });
    excelRows.forEach((row) => {
      sheet.addRow(row);
    });

    this.applyAutoWidth(sheet);

    const warnings = (rows as any).__warnings as
      | Array<{
          sessionId: string;
          sessionDate: Date;
          studentId: string;
          reason: string;
        }>
      | undefined;
    if (warnings && warnings.length > 0) {
      const warnSheet = workbook.addWorksheet("Cảnh báo");
      warnSheet.columns = [
        { header: "Mã buổi học", key: "sessionId", width: 36 },
        { header: "Ngày học", key: "sessionDate", width: 14 },
        { header: "Mã học viên", key: "studentId", width: 36 },
        { header: "Lý do", key: "reason", width: 48 },
      ];
      warnSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
      warnSheet.getRow(1).font = { bold: true };
      warnings.forEach((w) => {
        warnSheet.addRow({
          sessionId: w.sessionId,
          sessionDate: this.formatDate(w.sessionDate),
          studentId: w.studentId,
          reason: w.reason,
        });
      });
      this.applyAutoWidth(warnSheet);
    }

    return workbook;
  }

  /** autoWidth tối thiểu 15 cho các cột */
  private applyAutoWidth(sheet: ExcelJS.Worksheet): void {
    sheet.columns?.forEach((col) => {
      if (col && typeof col.width === 'number') {
        col.width = Math.max(col.width, 15);
      }
    });
  }

  /**
   * Xuất dữ liệu feedback của một lớp ra file Excel (báo cáo).
   * Giữ nguyên behavior cũ để không ảnh hưởng các luồng hiện tại.
   */
  async exportByClass(classId: string, sessions: SessionFeedbackExport[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Xử lý edge case buffer rỗng nếu không có dữ liệu
    if (!sessions || sessions.length === 0) {
      const emptySheet = workbook.addWorksheet('No Data');
      emptySheet.addRow(['Không có dữ liệu cho khoảng thời gian này']);
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer as unknown as Buffer;
    }

    // Sheet 1: Tổng hợp
    const sumSheet = workbook.addWorksheet('Tổng hợp');
    
    // Sort sessions by date
    const sortedSessions = [...sessions].sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime());
    
    // Lấy danh sách tất cả học viên (unique theo ID) để tạo row Tổng hợp
    const studentMap = new Map<string, string>();
    sortedSessions.forEach((session) => {
      session.feedbacks.forEach((fb) => {
        studentMap.set(fb.studentId, fb.studentName);
      });
    });

    const students = Array.from(studentMap.entries()).map(([id, name]) => ({ id, name }));

    // Cột của Sheet Tổng hợp
    const sumColumns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'Học viên', key: 'studentName', width: 25 },
    ];

    // Thêm các cột tương ứng với từng ngày học
    sortedSessions.forEach((s) => {
      const dateStr = this.formatDate(s.sessionDate);
      sumColumns.push({ header: dateStr, key: s.sessionId, width: 15 });
    });

    sumSheet.columns = sumColumns;

    // Freeze row đầu tiên, in đậm header
    sumSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    sumSheet.getRow(1).font = { bold: true };

    // Thêm dữ liệu học viên vào Sheet Tổng hợp
    students.forEach((student, index) => {
      const rowData: Record<string, string | number> = {
        stt: index + 1,
        studentName: student.name,
      };

      sortedSessions.forEach((s) => {
        const fb = s.feedbacks.find((f) => f.studentId === student.id);
        // Cell = điểm tham gia TB (participation)
        rowData[s.sessionId] = fb?.participation || '';
      });

      sumSheet.addRow(rowData);
    });
    this.applyAutoWidth(sumSheet);

    // Sheet 2: Chi tiết
    const detailSheet = workbook.addWorksheet('Chi tiết');
    
    detailSheet.columns = [
      { header: 'Ngày học', key: 'date', width: 15 },
      { header: 'Học viên', key: 'studentName', width: 25 },
      { header: 'Chuyên cần', key: 'attendance', width: 15 },
      { header: 'Bài tập', key: 'homework', width: 15 },
      { header: 'Tham gia', key: 'participation', width: 15 },
      { header: 'Hành vi', key: 'behavior', width: 15 },
      { header: 'Ngôn ngữ', key: 'language_usage', width: 15 },
      { header: 'Nhận xét', key: 'comment', width: 40 },
    ];

    // Freeze row đầu tiên, in đậm header
    detailSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    detailSheet.getRow(1).font = { bold: true };

    // Thêm dữ liệu vào Sheet Chi tiết
    sortedSessions.forEach((s) => {
      const dateStr = this.formatDate(s.sessionDate);
      s.feedbacks.forEach((fb) => {
        detailSheet.addRow({
          date: dateStr,
          studentName: fb.studentName,
          attendance: fb.attendance || '',
          homework: fb.homework || '',
          participation: fb.participation || '',
          behavior: fb.behavior || '',
          language_usage: '',
          comment: fb.comment || '',
        });
      });
    });
    this.applyAutoWidth(detailSheet);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  /**
   * Xuất file Excel template cho 1 buổi học (Session).
   * - Header bám chuẩn FEEDBACK_EXCEL_COLUMNS.
   * - Mỗi học viên một dòng, có sẵn khóa session / class / student.
   * - Các cột feedback / score để trống hoặc pre-fill nếu có dữ liệu.
   */
  async exportSessionTemplate(rows: SessionFeedbackTemplateRowInput[]): Promise<Buffer> {
    const workbook = this.buildSessionTemplateWorkbook(rows);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async streamSessionTemplate(rows: SessionFeedbackTemplateRowInput[], writable: Writable): Promise<void> {
    const workbook = this.buildSessionTemplateWorkbook(rows);
    await workbook.xlsx.write(writable);
  }

  /**
   * Xuất báo cáo current feedback (bao gồm cả điểm số nếu có)
   * theo canonical sheet SessionFeedback.
   */
  async exportSessionFeedbackReport(rows: SessionFeedbackTemplateRowInput[]): Promise<Buffer> {
    const workbook = this.buildSessionFeedbackReportWorkbook(rows);

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async streamSessionFeedbackReport(rows: SessionFeedbackTemplateRowInput[], writable: Writable): Promise<void> {
    const workbook = this.buildSessionFeedbackReportWorkbook(rows);
    await workbook.xlsx.write(writable);
  }

  /**
   * Build mảng object cho từng dòng template từ nguồn đã được UseCase chuẩn hóa.
   * Mỗi object có key là canonical header, value là string/number/null.
   */
  private buildTemplateRows(
    rows: SessionFeedbackTemplateRowInput[],
    options: { includeScores: boolean },
  ): Array<Record<FeedbackExcelColumnKey, string | number | null>> {
    return rows.map((row) => {
      // Format DD/MM/YYYY thống nhất — importer đã hỗ trợ parse cả hai
      const formattedDate = this.formatDate(row.sessionDate);

      const result: Record<FeedbackExcelColumnKey, string | number | null> = {
        session_id: row.sessionId,
        session_date: formattedDate,
        session_type: row.sessionType,
        class_code: row.classCode,
        student_id: row.studentId,
        student_name: row.studentName,
        attendance: row.attendance ?? null,
        homework: row.homework ?? null,
        participation: row.participation ?? null,
        behavior: row.behavior ?? null,
        language_usage: row.languageUsage ?? null,
        comment: row.comment ?? null,
        score_listening: options.includeScores ? row.scoreListening ?? null : null,
        score_reading: options.includeScores ? row.scoreReading ?? null : null,
        score_writing: options.includeScores ? row.scoreWriting ?? null : null,
        score_speaking: options.includeScores ? row.scoreSpeaking ?? null : null,
        score_total: options.includeScores ? row.scoreTotal ?? null : null,
        score_note: options.includeScores ? row.scoreNote ?? null : null,
      };

      return result;
    });
  }

  /**
   * Cấu hình header cho sheet template:
   * - Đặt header theo đúng canonical order.
   * - Set độ rộng cơ bản, bôi đậm row header và freeze hàng đầu tiên.
   */
  /** Cấu hình header tiếng Việt cho template — importer chấp nhận cả tiếng Việt và tiếng Anh */
  private configureTemplateHeader(sheet: ExcelJS.Worksheet): void {
    const defaultWidth = 16;

    sheet.columns = FEEDBACK_EXCEL_COLUMNS.map((colKey) => {
      const key: FeedbackExcelColumnKey = colKey;
      const header = FEEDBACK_HEADERS_VI[key];
      let width = defaultWidth;

      if (key === 'session_id' || key === 'student_id') {
        width = 36;
      } else if (key === 'comment' || key === 'score_note') {
        width = 40;
      } else if (key === 'student_name' || key === 'class_code') {
        width = 24;
      }

      return { header, key, width };
    });

    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    sheet.getRow(1).font = { bold: true };
  }

  /** Format ngày DD/MM/YYYY thống nhất cho hiển thị và import */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}


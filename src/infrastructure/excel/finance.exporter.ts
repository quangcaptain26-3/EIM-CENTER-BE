import * as ExcelJS from 'exceljs';
import type { Writable } from "stream";
import { resolveEffectiveInvoiceStatus } from '../../domain/finance/services/invoice-overdue.rule';

export interface InvoiceExportData {
  invoice_id: string;
  total_amount: number;
  status: string;
  due_date: Date;
  student_name: string;
  program_name: string;
  paid_amount: number;
  last_payment_date: Date | null;
}

export class FinanceExporter {
  /**
   * Xuất danh sách hóa đơn theo định dạng Excel
   * @param invoices Danh sách hóa đơn kèm thông tin thanh toán
   * @returns Buffer chứa nội dung file Excel
   */
  private buildWorkbook(invoices: InvoiceExportData[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    
    if (!invoices || invoices.length === 0) {
      const emptySheet = workbook.addWorksheet("No Data");
      emptySheet.addRow(["Không có dữ liệu cho khoảng thời gian này"]);
      return workbook;
    }

    const sheet = workbook.addWorksheet("Danh sách hóa đơn");
    
    // Cài đặt columns
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 5 },
      { header: 'Tên học viên', key: 'student_name', width: 25 },
      { header: 'Chương trình', key: 'program_name', width: 25 },
      { header: 'Tổng tiền', key: 'total_amount', width: 15 },
      { header: 'Đã thanh toán', key: 'paid_amount', width: 15 },
      { header: 'Còn lại', key: 'remaining_amount', width: 15 },
      { header: 'Hạn đóng', key: 'due_date', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Ngày thanh toán cuối', key: 'last_payment_date', width: 25 },
    ];

    // Freeze row đầu tiên và in đậm
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    sheet.getRow(1).font = { bold: true };

    let totalAmountSum = 0;
    let paidAmountSum = 0;
    let remainingAmountSum = 0;

    const now = new Date();

    invoices.forEach((inv, index) => {
      // Ép kiểu về số an toàn
      const totalAmount = Number(inv.total_amount) || 0;
      const paidAmount = Number(inv.paid_amount) || 0;
      const remainingAmount = Math.max(0, totalAmount - paidAmount);
      
      totalAmountSum += totalAmount;
      paidAmountSum += paidAmount;
      remainingAmountSum += remainingAmount;

      const dueDateObj = new Date(inv.due_date);
      const effectiveStatus = resolveEffectiveInvoiceStatus({
        status: inv.status as any,
        dueDate: dueDateObj,
        remainingAmount,
        now,
      });
      const isOverdue = effectiveStatus === 'OVERDUE';

      const row = sheet.addRow({
        stt: index + 1,
        student_name: inv.student_name || '',
        program_name: inv.program_name || '',
        total_amount: totalAmount,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        due_date: this.formatDate(inv.due_date),
        status: effectiveStatus,
        last_payment_date: inv.last_payment_date ? this.formatDate(inv.last_payment_date) : '',
      });

      // Format số liệu
      row.getCell('total_amount').numFmt = '#,##0';
      row.getCell('paid_amount').numFmt = '#,##0';
      row.getCell('remaining_amount').numFmt = '#,##0';

      // Highlight màu đỏ nhạt nếu overdue
      if (isOverdue) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCCCC' } // Đỏ nhạt
        };
      }
    });

    // Row tổng cộng ở cuối
    const summaryRow = sheet.addRow({
      student_name: 'TỔNG CỘNG',
      total_amount: totalAmountSum,
      paid_amount: paidAmountSum,
      remaining_amount: remainingAmountSum,
    });
    
    // In đậm dòng tổng và format
    summaryRow.font = { bold: true };
    summaryRow.getCell('total_amount').numFmt = '#,##0';
    summaryRow.getCell('paid_amount').numFmt = '#,##0';
    summaryRow.getCell('remaining_amount').numFmt = '#,##0';

    return workbook;
  }

  async exportInvoices(invoices: InvoiceExportData[]): Promise<Buffer> {
    const workbook = this.buildWorkbook(invoices);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async streamInvoices(invoices: InvoiceExportData[], writable: Writable): Promise<void> {
    const workbook = this.buildWorkbook(invoices);
    await workbook.xlsx.write(writable);
  }

  // Tiện ích format ngày cho columns
  private formatDate(date: string | Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

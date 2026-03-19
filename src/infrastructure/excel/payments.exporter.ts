import * as ExcelJS from "exceljs";
import type { Writable } from "stream";

export interface PaymentExportRow {
  payment_id: string;
  payment_amount: number;
  payment_method: string;
  paid_at: Date | string;
  payment_created_at: Date | string;
  invoice_id: string;
  due_date: Date | string;
  invoice_status: string;
  student_name: string;
  program_name: string | null;
}

export class PaymentsExporter {
  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private buildWorkbook(payments: PaymentExportRow[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();

    if (!payments || payments.length === 0) {
      const emptySheet = workbook.addWorksheet("No Data");
      emptySheet.addRow(["Không có dữ liệu thanh toán cho khoảng thời gian này"]);
      return workbook;
    }

    const sheet = workbook.addWorksheet("Danh sách thanh toán");
    sheet.columns = [
      { header: "STT", key: "stt", width: 6 },
      { header: "Học viên", key: "student_name", width: 28 },
      { header: "Chương trình", key: "program_name", width: 24 },
      { header: "Hóa đơn ID", key: "invoice_id", width: 18 },
      { header: "Mã payment", key: "payment_id", width: 18 },
      { header: "Số tiền", key: "payment_amount", width: 14 },
      { header: "Phương thức", key: "payment_method", width: 12 },
      { header: "Ngày thanh toán", key: "paid_at", width: 14 },
      { header: "Hạn đóng", key: "due_date", width: 14 },
      { header: "Trạng thái hóa đơn", key: "invoice_status", width: 16 },
      { header: "Created At", key: "payment_created_at", width: 14 },
    ];

    sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
    sheet.getRow(1).font = { bold: true };

    let amountSum = 0;
    payments.forEach((p, idx) => {
      const paymentAmount = Number(p.payment_amount) || 0;
      amountSum += paymentAmount;

      const row = sheet.addRow({
        stt: idx + 1,
        student_name: p.student_name ?? "",
        program_name: p.program_name ?? "",
        invoice_id: p.invoice_id,
        payment_id: p.payment_id,
        payment_amount: paymentAmount,
        payment_method: p.payment_method,
        paid_at: this.formatDate(p.paid_at),
        due_date: this.formatDate(p.due_date),
        invoice_status: p.invoice_status,
        payment_created_at: this.formatDate(p.payment_created_at),
      });

      row.getCell("payment_amount").numFmt = "#,##0";
    });

    // Tổng cộng cuối sheet
    const summaryRow = sheet.addRow({
      student_name: "TỔNG CỘNG",
      payment_amount: amountSum,
    });
    summaryRow.font = { bold: true };
    summaryRow.getCell("payment_amount").numFmt = "#,##0";

    return workbook;
  }

  async exportPayments(payments: PaymentExportRow[]): Promise<Buffer> {
    const workbook = this.buildWorkbook(payments);
    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async streamPayments(payments: PaymentExportRow[], writable: Writable): Promise<void> {
    const workbook = this.buildWorkbook(payments);
    await workbook.xlsx.write(writable);
  }
}


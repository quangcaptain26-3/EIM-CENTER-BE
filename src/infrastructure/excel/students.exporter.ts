import * as ExcelJS from "exceljs";
import type { Writable } from "stream";
import type { Student } from "../../domain/students/entities/student.entity";

export class StudentsExporter {
  private formatDate(date: Date | null | undefined): string {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private buildWorkbook(students: Student[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();

    if (!students || students.length === 0) {
      const emptySheet = workbook.addWorksheet("No Data");
      emptySheet.addRow(["Không có dữ liệu cho điều kiện lọc này"]);
      return workbook;
    }

    const sheet = workbook.addWorksheet("Danh sách học viên");
    sheet.columns = [
      { header: "STT", key: "stt", width: 6 },
      { header: "Họ tên", key: "fullName", width: 30 },
      { header: "SĐT", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 26 },
      { header: "Ngày sinh", key: "dob", width: 14 },
      { header: "Giới tính", key: "gender", width: 14 },
      { header: "Họ tên phụ huynh", key: "guardianName", width: 22 },
      { header: "SĐT phụ huynh", key: "guardianPhone", width: 18 },
      { header: "Địa chỉ", key: "address", width: 26 },
      { header: "Ngày tạo", key: "createdAt", width: 14 },
    ];

    sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
    sheet.getRow(1).font = { bold: true };

    students.forEach((s, idx) => {
      sheet.addRow({
        stt: idx + 1,
        fullName: s.fullName,
        phone: s.phone ?? "",
        email: s.email ?? "",
        dob: this.formatDate(s.dob),
        gender: s.gender ?? "",
        guardianName: s.guardianName ?? "",
        guardianPhone: s.guardianPhone ?? "",
        address: s.address ?? "",
        createdAt: this.formatDate(s.createdAt),
      });
    });

    return workbook;
  }

  async exportStudents(students: Student[]): Promise<Buffer> {
    const workbook = this.buildWorkbook(students);
    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async streamStudents(students: Student[], writable: Writable): Promise<void> {
    const workbook = this.buildWorkbook(students);
    await workbook.xlsx.write(writable);
  }
}


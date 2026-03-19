import type { StudentRepoPort } from "../../../domain/students/repositories/student.repo.port";
import type { StudentsExporter } from "../../../infrastructure/excel/students.exporter";
import type { Writable } from "stream";
import { ExportStudentsQuerySchema, type ExportStudentsQuery } from "../dtos/student.dto";

import { AppError } from "../../../shared/errors/app-error";

export class ExportStudentsUseCase {
  private readonly MAX_EXPORT_ROWS = 5000;

  constructor(
    private readonly studentRepo: StudentRepoPort,
    private readonly studentsExporter: StudentsExporter,
  ) {}

  async execute(query: ExportStudentsQuery): Promise<Buffer> {
    const validated = ExportStudentsQuerySchema.parse(query);

    if (validated.limit <= 0) {
      throw AppError.badRequest("Giới hạn xuất không hợp lệ", { code: "EXPORT/INVALID_LIMIT" });
    }

    const students = await this.studentRepo.list({
      search: validated.search,
      limit: validated.limit,
      offset: 0,
    });

    if (students.length > this.MAX_EXPORT_ROWS) {
      throw AppError.badRequest("Số học viên xuất vượt ngưỡng an toàn", {
        code: "STUDENTS_EXPORT/ROW_LIMIT_EXCEEDED",
        rowLimit: this.MAX_EXPORT_ROWS,
      });
    }

    return this.studentsExporter.exportStudents(students);
  }

  async stream(query: ExportStudentsQuery, writable: Writable): Promise<void> {
    const validated = ExportStudentsQuerySchema.parse(query);

    if (validated.limit <= 0) {
      throw AppError.badRequest("Giới hạn xuất không hợp lệ", { code: "EXPORT/INVALID_LIMIT" });
    }

    const students = await this.studentRepo.list({
      search: validated.search,
      limit: validated.limit,
      offset: 0,
    });

    if (students.length > this.MAX_EXPORT_ROWS) {
      throw AppError.badRequest("Số học viên xuất vượt ngưỡng an toàn", {
        code: "STUDENTS_EXPORT/ROW_LIMIT_EXCEEDED",
        rowLimit: this.MAX_EXPORT_ROWS,
      });
    }

    await this.studentsExporter.streamStudents(students, writable);
  }
}


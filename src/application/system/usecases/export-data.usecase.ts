import { ExportResult, ExportType } from '../dtos/import-export.dto';
import { StudentsExporter } from '../../../infrastructure/excel/exporters/students.exporter';
import { AttendanceSheetExporter } from '../../../infrastructure/excel/exporters/attendance-sheet.exporter';
import { PayrollExporter } from '../../../infrastructure/excel/exporters/payroll.exporter';
import { ReceiptsExporter } from '../../../infrastructure/excel/exporters/receipts.exporter';
import { DebtReportExporter } from '../../../infrastructure/excel/exporters/debt-report.exporter';
import { ClassRosterExporter } from '../../../infrastructure/excel/exporters/class-roster.exporter';
import { AuditLogsCsvExporter } from '../../../infrastructure/excel/exporters/audit-logs-csv.exporter';
import { AuditWriter } from './audit-writer';
import { Pool } from 'pg';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

const MIME_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MIME_CSV = 'text/csv; charset=utf-8';

function sanitizeSegment(s: string): string {
  const t = String(s).replace(/[/\\?%*:|"<>]/g, '-').trim();
  return t || 'x';
}

function fileDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function coerceDate(v: unknown, fallback: Date): Date {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return fallback;
}

function monthRangeEnd(ref: Date): { from: Date; to: Date } {
  const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { from, to };
}

export class ExportDataUseCase {
  constructor(
    private readonly db: Pool,
    private readonly studentsExporter: StudentsExporter,
    private readonly attendanceSheetExporter: AttendanceSheetExporter,
    private readonly payrollExporter: PayrollExporter,
    private readonly receiptsExporter: ReceiptsExporter,
    private readonly debtReportExporter: DebtReportExporter,
    private readonly classRosterExporter: ClassRosterExporter,
    private readonly auditLogsCsvExporter: AuditLogsCsvExporter,
    private readonly auditWriter: AuditWriter,
  ) {}

  async execute(type: ExportType, filters: Record<string, unknown>, actor: any): Promise<ExportResult> {
    let buffer: Buffer;
    let rowCount = 0;
    let filename: string;
    let contentType: string = MIME_XLSX;

    const today = new Date();

    switch (type) {
      case 'students': {
        const dateLabel = fileDate(coerceDate(filters.date, today));
        filename = `DanhSachHocVien_${dateLabel}.xlsx`;

        const { rows } = await this.db.query(`
          SELECT s.*,
            e.class_id, c.class_code, e.status,
            enrollment_debt(e.id) AS debt
          FROM mv_search_students s
          LEFT JOIN LATERAL (
            SELECT e.id, e.class_id, e.status FROM enrollments e
            WHERE e.student_id = s.id AND e.status IN ('active', 'trial', 'paused')
            ORDER BY e.enrolled_at DESC LIMIT 1
          ) e ON true
          LEFT JOIN classes c ON c.id = e.class_id
        `);
        const mapped = rows.map((r: any) => ({
          studentCode: r.student_code,
          fullName: r.full_name,
          dob: r.dob,
          parentName: r.parent_name,
          parentPhone: r.parent_phone,
          activeEnrollment: r.class_code ? { classCode: r.class_code, status: r.status } : null,
          debt: r.debt ?? 0,
        }));
        buffer = await this.studentsExporter.export(mapped);
        rowCount = rows.length;
        break;
      }
      case 'attendance-sheet': {
        const classId = filters.classId as string | undefined;
        if (!classId || typeof classId !== 'string') {
          throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Thiếu classId', 400);
        }
        const cr = await this.db.query(`SELECT class_code FROM classes WHERE id = $1`, [classId]);
        if (!cr.rows[0]) {
          throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Không tìm thấy lớp', 404);
        }
        const classCode = sanitizeSegment(String(cr.rows[0].class_code));
        const dateLabel = fileDate(coerceDate(filters.date, today));
        filename = `DiemDanh_${classCode}_${dateLabel}.xlsx`;

        const { rows: students } = await this.db.query(
          `
          SELECT s.id, s.student_code AS "studentCode", s.full_name AS "fullName"
          FROM students s
          JOIN enrollments e ON e.student_id = s.id
          WHERE e.class_id = $1 AND e.status IN ('trial', 'active')
          ORDER BY s.full_name
        `,
          [classId],
        );

        const { rows: sessions } = await this.db.query(
          `
          SELECT id, session_no AS "sessionNumber", session_date AS date
          FROM sessions
          WHERE class_id = $1
          ORDER BY session_no
        `,
          [classId],
        );

        const { rows: attendance } = await this.db.query(
          `
          SELECT a.session_id, a.student_id, a.status
          FROM attendance a
          INNER JOIN sessions sess ON sess.id = a.session_id
          WHERE sess.class_id = $1
        `,
          [classId],
        );

        const attendanceMap: Record<string, Record<string, string>> = {};
        attendance.forEach((a: any) => {
          if (!attendanceMap[a.student_id]) attendanceMap[a.student_id] = {};
          attendanceMap[a.student_id][a.session_id] = a.status;
        });

        buffer = await this.attendanceSheetExporter.export(
          classCode,
          students,
          sessions,
          attendanceMap,
        );
        rowCount = students.length;
        break;
      }
      case 'payroll': {
        const payrollId = filters.payrollId as string | undefined;
        if (!payrollId) {
          throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Thiếu payrollId', 400);
        }
        const { rows: pr } = await this.db.query(
          `
          SELECT p.*, u.full_name AS "teacherName", u.user_code AS "teacherCode"
          FROM payroll_records p
          JOIN users u ON u.id = p.teacher_id
          WHERE p.id = $1
        `,
          [payrollId],
        );
        if (!pr.length) {
          throw new AppError(ERROR_CODES.PAYROLL_NOT_FOUND, 'Không tìm thấy bảng lương', 404);
        }
        const row = pr[0];
        const month = Number(row.period_month);
        const year = Number(row.period_year);
        const teacherCode = sanitizeSegment(String(row.teacherCode));
        filename = `BangLuong_Thang${month}_${year}_${teacherCode}.xlsx`;

        const payroll = {
          teacherName: row.teacherName,
          teacherCode: row.teacherCode,
          periodMonth: month,
          totalSessionsVal: row.sessions_count,
          salaryPerSession: row.salary_per_session_snapshot,
          allowance: row.allowance_snapshot,
          totalSalary: row.total_salary,
        };
        const { rows: details } = await this.db.query(
          `
          SELECT session_date AS date, class_code AS "classCode", was_cover AS "isCover"
          FROM payroll_session_details
          WHERE payroll_id = $1
          ORDER BY session_date
        `,
          [payrollId],
        );
        buffer = await this.payrollExporter.export(payroll, details);
        rowCount = details.length;
        break;
      }
      case 'receipts': {
        const { from, to } = monthRangeEnd(coerceDate(filters.dateTo as string, today));
        const dateFrom = coerceDate(filters.dateFrom, from);
        const dateTo = coerceDate(filters.dateTo, to);
        const fromLabel = fileDate(dateFrom);
        const toLabel = fileDate(dateTo);
        filename = `SoThuChi_${fromLabel}_${toLabel}.xlsx`;

        const { rows: receipts } = await this.db.query(
          `
          SELECT
            r.receipt_code AS "receiptCode",
            r.created_at AS "createdAt",
            r.payer_name AS "payerName",
            r.amount,
            r.payment_method AS "paymentMethod",
            r.note,
            u.full_name AS "createdByName",
            CASE WHEN r.amount >= 0 THEN 'IN' ELSE 'OUT' END AS type
          FROM receipts r
          LEFT JOIN users u ON u.id = r.created_by
          WHERE r.payment_date >= $1::date AND r.payment_date <= $2::date
          ORDER BY r.payment_date DESC, r.created_at DESC
        `,
          [fromLabel, toLabel],
        );
        buffer = await this.receiptsExporter.export(receipts);
        rowCount = receipts.length;
        break;
      }
      case 'debt-report': {
        const dateLabel = fileDate(coerceDate(filters.date, today));
        filename = `CongNo_${dateLabel}.xlsx`;

        const { rows: debtRows } = await this.db.query(`
          SELECT s.student_code AS "studentCode",
                 s.full_name AS "studentName",
                 c.class_code AS "classCode",
                 s.parent_name AS "parentName",
                 s.parent_phone AS "parentPhone",
                 (e.tuition_fee - COALESCE(SUM(r.amount), 0))::numeric AS debt
          FROM enrollments e
          JOIN students s ON s.id = e.student_id
          JOIN classes c ON c.id = e.class_id
          LEFT JOIN receipts r ON r.enrollment_id = e.id
          GROUP BY e.id, e.tuition_fee, s.student_code, s.full_name, c.class_code,
                   s.parent_name, s.parent_phone
          HAVING e.tuition_fee - COALESCE(SUM(r.amount), 0) > 0
        `);
        buffer = await this.debtReportExporter.export(debtRows);
        rowCount = debtRows.length;
        break;
      }
      case 'audit-logs': {
        if (actor.role !== 'ADMIN') {
          throw new AppError(ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION, 'Chỉ ADMIN được xuất audit log', 403);
        }
        const { from, to } = monthRangeEnd(coerceDate(filters.dateTo as string, today));
        const dateFrom = coerceDate(filters.dateFrom, from);
        const dateTo = coerceDate(filters.dateTo, to);
        const fromLabel = fileDate(dateFrom);
        const toLabel = fileDate(dateTo);
        filename = `AuditLog_${fromLabel}_${toLabel}.csv`;
        contentType = MIME_CSV;

        const { rows: logs } = await this.db.query(
          `
          SELECT
            al.event_time,
            al.actor_id,
            al.actor_code,
            al.actor_role,
            al.action,
            al.entity_type,
            al.entity_id,
            al.entity_code,
            al.description,
            u.full_name AS actor_full_name
          FROM audit_logs al
          LEFT JOIN users u ON u.id = al.actor_id
          WHERE al.event_time::date >= $1::date
            AND al.event_time::date <= $2::date
          ORDER BY al.event_time DESC
          LIMIT 50000
        `,
          [fromLabel, toLabel],
        );

        const csvRows = logs.map((r: any) => {
          const actorLabel =
            r.actor_full_name || r.actor_code || (r.actor_id ? String(r.actor_id) : '—');
          const parts = [r.entity_type, r.entity_code].filter(Boolean);
          const entityLabel =
            parts.length > 0 ? parts.join(' ') : r.entity_id ? String(r.entity_id) : '';
          return {
            eventTime: r.event_time,
            actorLabel,
            actorRole: r.actor_role ?? '',
            action: r.action ?? '',
            entityLabel,
            description: r.description ?? '',
          };
        });
        buffer = this.auditLogsCsvExporter.export(csvRows);
        rowCount = csvRows.length;
        break;
      }
      case 'class-roster': {
        const classId = filters.classId as string | undefined;
        if (!classId || typeof classId !== 'string') {
          throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Thiếu classId', 400);
        }
        const cr = await this.db.query(`SELECT class_code FROM classes WHERE id = $1`, [classId]);
        if (!cr.rows[0]) {
          throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Không tìm thấy lớp', 404);
        }
        const classCode = sanitizeSegment(String(cr.rows[0].class_code));
        const dateLabel = fileDate(coerceDate(filters.date, today));
        filename = `DanhSachLop_${classCode}_${dateLabel}.xlsx`;

        const { rows: roster } = await this.db.query(
          `
          SELECT s.student_code AS "studentCode",
                 s.full_name AS "fullName",
                 s.dob,
                 s.parent_name AS "parentName",
                 s.parent_phone AS "parentPhone",
                 e.sessions_attended AS "sessionsAttended",
                 enrollment_debt(e.id) AS debt
          FROM enrollments e
          JOIN students s ON s.id = e.student_id
          WHERE e.class_id = $1 AND e.status IN ('trial', 'active')
          ORDER BY s.full_name
        `,
          [classId],
        );
        buffer = await this.classRosterExporter.export(classCode, roster);
        rowCount = roster.length;
        break;
      }
      default:
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Loại export không được hỗ trợ', 400);
    }

    this.auditWriter.write({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'SYSTEM:export',
      description: `Xuất dữ liệu: ${type}`,
      metadata: { type, filters, rowCount },
    });

    return { buffer, filename, contentType };
  }
}

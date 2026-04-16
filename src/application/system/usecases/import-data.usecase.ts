import { Pool, PoolClient } from 'pg';
import { StudentsImporter, StudentImportRow } from '../../../infrastructure/excel/importers/students.importer';
import { UsersImporter, UserImportRow } from '../../../infrastructure/excel/importers/users.importer';
import { AttendanceImporter, AttendanceImportRow } from '../../../infrastructure/excel/importers/attendance.importer';
import { EnrollmentsImporter, EnrollmentImportRow } from '../../../infrastructure/excel/importers/enrollments.importer';
import { HolidaysImporter, HolidayImportRow } from '../../../infrastructure/excel/importers/holidays.importer';
import { ReceiptsImporter, ReceiptImportRow } from '../../../infrastructure/excel/importers/receipts.importer';
import { ImportMode, ImportType } from '../dtos/import-export.dto';
import { CreateStudentUseCase } from '../../students/usecases/create-student.usecase';
import { CreateUserUseCase } from '../../auth/usecases/create-user.usecase';
import { RecordAttendanceUseCase } from '../../students/usecases/record-attendance.usecase';
import { CreateEnrollmentUseCase } from '../../students/usecases/create-enrollment.usecase';
import { CreateReceiptUseCase } from '../../finance/usecases/create-receipt.usecase';
import { ActivateEnrollmentUseCase, IFinanceCheckService } from '../../students/usecases/activate-enrollment.usecase';
import { EnrollmentTransitionRule } from '../../../domain/students/services/enrollment-transition.rule';
import { PasswordHasher } from '../../../infrastructure/auth/password-hasher';
import { StudentPgRepo } from '../../../infrastructure/db/repositories/students/student.pg.repo';
import { EnrollmentPgRepo } from '../../../infrastructure/db/repositories/students/enrollment.pg.repo';
import { EnrollmentHistoryPgRepo } from '../../../infrastructure/db/repositories/students/enrollment-history.pg.repo';
import { AttendancePgRepo } from '../../../infrastructure/db/repositories/students/attendance.pg.repo';
import { UserPgRepo } from '../../../infrastructure/db/repositories/auth/user.pg.repo';
import { RolePgRepo } from '../../../infrastructure/db/repositories/auth/role.pg.repo';
import { SalaryLogPgRepo } from '../../../infrastructure/db/repositories/auth/salary-log.pg.repo';
import { AuditLogPgRepo } from '../../../infrastructure/db/repositories/auth/audit-log.pg.repo';
import { ClassPgRepo } from '../../../infrastructure/db/repositories/classes/class.pg.repo';
import { ProgramPgRepo } from '../../../infrastructure/db/repositories/classes/program.pg.repo';
import { SessionPgRepo as ClassSessionPgRepo } from '../../../infrastructure/db/repositories/sessions/session.pg.repo';
import { SessionCoverPgRepo } from '../../../infrastructure/db/repositories/sessions/session-cover.pg.repo';
import { ReceiptPgRepo } from '../../../infrastructure/db/repositories/finance/receipt.pg.repo';
import { refreshSearchViews } from '../../../infrastructure/db/refresh-views';
import { logger } from '../../../shared/logger';
import { AuditWriter } from './audit-writer';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class ImportDataUseCase {
  constructor(
    private readonly db: Pool,
    private readonly studentsImporter: StudentsImporter,
    private readonly usersImporter: UsersImporter,
    private readonly attendanceImporter: AttendanceImporter,
    private readonly enrollmentsImporter: EnrollmentsImporter,
    private readonly holidaysImporter: HolidaysImporter,
    private readonly receiptsImporter: ReceiptsImporter,
    private readonly passwordHasher: PasswordHasher,
    private readonly auditWriter: AuditWriter,
  ) {}

  private makeCreateReceiptUseCase(client: PoolClient): CreateReceiptUseCase {
    const receiptRepo = new ReceiptPgRepo(client);
    const enrollmentRepo = new EnrollmentPgRepo(client);
    const auditLogRepo = new AuditLogPgRepo(client);
    const enrollmentHistoryRepo = new EnrollmentHistoryPgRepo(client);
    const studentRepo = new StudentPgRepo(client);
    const transitionRule = new EnrollmentTransitionRule();
    const financeCheck: IFinanceCheckService = {
      checkSufficientReceipt: async (enrollmentId: string, requiredAmount: number) => {
        const receipts = await receiptRepo.findByEnrollment(enrollmentId);
        const total = receipts.reduce((sum, r) => sum + r.amount, 0);
        return total >= requiredAmount;
      },
    };
    const activateUc = new ActivateEnrollmentUseCase(
      enrollmentRepo,
      enrollmentHistoryRepo,
      transitionRule,
      financeCheck,
      studentRepo,
      auditLogRepo,
    );
    return new CreateReceiptUseCase(receiptRepo, enrollmentRepo, auditLogRepo, (enrollmentId, actor) =>
      activateUc.execute(enrollmentId, actor),
    );
  }

  private async importRow(
    client: PoolClient,
    row: unknown,
    type: ImportType,
    actor: { id: string; role: string; ip?: string },
  ): Promise<void> {
    switch (type) {
      case 'students': {
        const s = row as StudentImportRow;
        const studentRepo = new StudentPgRepo(client);
        const auditLogRepo = new AuditLogPgRepo(client);
        const uc = new CreateStudentUseCase(studentRepo, auditLogRepo, this.db);
        await uc.execute(
          {
            fullName: s.fullName,
            parentName: s.parentName,
            parentPhone: s.parentPhone,
            dob: s.dob ? s.dob.toISOString().split('T')[0] : undefined,
            gender: s.gender,
            parentPhone2: s.parentPhone2,
            parentZalo: s.parentZalo,
            schoolName: s.schoolName,
            address: s.address,
          },
          actor,
          { skipSearchRefresh: true },
        );
        break;
      }
      case 'users': {
        const u = row as UserImportRow;
        const userRepo = new UserPgRepo(client);
        const roleRepo = new RolePgRepo(client);
        const salaryLogRepo = new SalaryLogPgRepo(client);
        const auditLogRepo = new AuditLogPgRepo(client);
        const uc = new CreateUserUseCase(
          userRepo,
          roleRepo,
          salaryLogRepo,
          auditLogRepo,
          this.passwordHasher,
          this.db,
        );
        await uc.execute(
          {
            email: u.email,
            password: 'Password123!',
            roleCode: u.roleCode as 'ADMIN' | 'ACADEMIC' | 'ACCOUNTANT' | 'TEACHER',
            fullName: u.fullName,
            gender: 'other',
            phone: u.phone,
            cccd: u.cccd,
            dob: u.dob,
            educationLevel: u.educationLevel,
            major: u.major,
            startDate: u.startDate,
            salaryPerSession: u.salaryPerSession,
          },
          actor.id,
          actor.ip || '',
          'bulk_import',
          { skipSearchRefresh: true },
        );
        break;
      }
      case 'attendance': {
        const a = row as AttendanceImportRow;
        const attendanceRepo = new AttendancePgRepo(client);
        const sessionRepo = new ClassSessionPgRepo(client);
        const sessionCoverRepo = new SessionCoverPgRepo(client);
        const enrollmentRepo = new EnrollmentPgRepo(client);
        const auditLogRepo = new AuditLogPgRepo(client);
        const uc = new RecordAttendanceUseCase(
          attendanceRepo,
          sessionRepo,
          sessionCoverRepo,
          enrollmentRepo,
          auditLogRepo,
        );
        await uc.execute(
          {
            sessionId: a.sessionId,
            records: [
              {
                studentId: a.studentId,
                enrollmentId: a.enrollmentId,
                status: a.status,
                note: a.note,
              },
            ],
          },
          actor,
        );
        break;
      }
      case 'enrollments': {
        const e = row as EnrollmentImportRow;
        const uc = new CreateEnrollmentUseCase(
          new StudentPgRepo(client),
          new EnrollmentPgRepo(client),
          new EnrollmentHistoryPgRepo(client),
          new ClassPgRepo(client),
          new ProgramPgRepo(client),
          new AuditLogPgRepo(client),
        );
        await uc.execute(
          {
            studentId: e.studentId,
            classId: e.classId,
            tuitionFee: e.tuitionFee,
          },
          actor,
        );
        break;
      }
      case 'holidays': {
        const h = row as HolidayImportRow;
        const key = h.holidayDate.toISOString().slice(0, 10);
        await client.query(
          `INSERT INTO holidays (holiday_date, name, is_recurring) VALUES ($1::date, $2, $3)`,
          [key, h.name, h.isRecurring],
        );
        break;
      }
      case 'receipts': {
        const r = row as ReceiptImportRow;
        const createReceiptUc = this.makeCreateReceiptUseCase(client);
        await createReceiptUc.execute(
          {
            payerName: r.payerName,
            payerAddress: '',
            studentId: r.studentId,
            enrollmentId: r.enrollmentId,
            reason: r.reason,
            amount: r.amount,
            paymentMethod: r.paymentMethod,
            paymentDate: r.paymentDate.toISOString().slice(0, 10),
            note: undefined,
            payerSignatureName: r.payerName,
          },
          actor,
        );
        break;
      }
      default:
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Loại import không được hỗ trợ', 400);
    }
  }

  async execute(type: ImportType, buffer: Buffer, mode: ImportMode, actor: any) {
    let parseResult: { valid: any[]; errors: any[] };

    switch (type) {
      case 'students':
        parseResult = await this.studentsImporter.parse(buffer);
        break;
      case 'users':
        parseResult = await this.usersImporter.parse(buffer);
        break;
      case 'attendance':
        parseResult = await this.attendanceImporter.parse(buffer);
        break;
      case 'enrollments':
        parseResult = await this.enrollmentsImporter.parse(buffer);
        break;
      case 'holidays':
        parseResult = await this.holidaysImporter.parse(buffer);
        break;
      case 'receipts':
        parseResult = await this.receiptsImporter.parse(buffer);
        break;
      default:
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Loại import không được hỗ trợ', 400);
    }

    if (mode === 'preview') {
      return {
        validCount: parseResult.valid.length,
        errorCount: parseResult.errors.length,
        errors: parseResult.errors,
        previewData: parseResult.valid.slice(0, 5),
      };
    }

    if (parseResult.valid.length === 0) {
      return { imported: 0, errors: parseResult.errors };
    }

    const client = await this.db.connect();
    let imported = 0;

    try {
      await client.query('BEGIN');

      for (const row of parseResult.valid) {
        await this.importRow(client, row, type, actor);
        imported++;
      }

      await client.query('COMMIT');

      if (type === 'students' || type === 'users') {
        void refreshSearchViews(this.db).catch((err) => logger.error(err));
      }

      this.auditWriter.write({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'SYSTEM:bulk_import',
        description: `Nhập dữ liệu hàng loạt: ${type}`,
        metadata: { type, importedCount: imported, errorCount: parseResult.errors.length },
      });

      return { imported, errors: parseResult.errors };
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      console.error('Import failed during commit:', error);
      if (error instanceof AppError) throw error;
      const msg = error instanceof Error ? error.message : String(error);
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        `Import thất bại sau ${imported} dòng đã xử lý: ${msg}`,
        500,
      );
    } finally {
      client.release();
    }
  }

  async getTemplate(type: ImportType): Promise<Buffer> {
    switch (type) {
      case 'students':
        return this.studentsImporter.getTemplate();
      case 'users':
        return this.usersImporter.getTemplate();
      case 'attendance':
        return this.attendanceImporter.getTemplate();
      case 'enrollments':
        return this.enrollmentsImporter.getTemplate();
      case 'holidays':
        return this.holidaysImporter.getTemplate();
      case 'receipts':
        return this.receiptsImporter.getTemplate();
      default:
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Loại template không được hỗ trợ', 400);
    }
  }
}

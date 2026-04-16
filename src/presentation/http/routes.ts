import { Router } from 'express';
import multer from 'multer';
import { db, holidayRepo } from '../../bootstrap/container';

// ─── Auth / User Repositories ────────────────────────────────────────────────
import { UserPgRepo } from '../../infrastructure/db/repositories/auth/user.pg.repo';
import { RolePgRepo } from '../../infrastructure/db/repositories/auth/role.pg.repo';
import { SessionPgRepo } from '../../infrastructure/db/repositories/auth/session.pg.repo';
import { AuditLogPgRepo } from '../../infrastructure/db/repositories/auth/audit-log.pg.repo';
import { SalaryLogPgRepo } from '../../infrastructure/db/repositories/auth/salary-log.pg.repo';

// ─── Infrastructure Services ──────────────────────────────────────────────────
import { JwtProvider } from '../../infrastructure/auth/jwt.provider';
import { PasswordHasher } from '../../infrastructure/auth/password-hasher';

// ─── Domain Services ──────────────────────────────────────────────────────────
import { RbacService } from '../../domain/auth/services/rbac.service';

// ─── Auth Use Cases ───────────────────────────────────────────────────────────
import { LoginUseCase } from '../../application/auth/usecases/login.usecase';
import { RefreshUseCase } from '../../application/auth/usecases/refresh.usecase';
import { LogoutUseCase } from '../../application/auth/usecases/logout.usecase';
import { MeUseCase } from '../../application/auth/usecases/me.usecase';
import { CreateUserUseCase } from '../../application/auth/usecases/create-user.usecase';
import { UpdateUserUseCase } from '../../application/auth/usecases/update-user.usecase';
import { UpdateSalaryUseCase } from '../../application/auth/usecases/update-salary.usecase';
import { ListUsersUseCase } from '../../application/auth/usecases/list-users.usecase';
import { GetUserUseCase } from '../../application/auth/usecases/get-user.usecase';
import { SoftDeleteUserUseCase } from '../../application/auth/usecases/soft-delete-user.usecase';

// ─── Auth Controllers ─────────────────────────────────────────────────────────
import { createAuthController } from './controllers/auth/auth.controller';
import { createUserController } from './controllers/auth/user.controller';

// ─── Middlewares ──────────────────────────────────────────────────────────────
import { authMiddleware } from './middlewares/auth.middleware';
import { authorize } from './middlewares/rbac.middleware';
import { requireOwnSession, requireOwnPayroll } from './middlewares/teacher-idor.middleware';
import { validate } from './middlewares/validate.middleware';

// ─── Auth / User DTOs ─────────────────────────────────────────────────────────
import { LoginDtoSchema, RefreshDtoSchema } from '../../application/auth/dtos/auth.dto';
import { CreateUserDtoSchema, UpdateUserDtoSchema, UpdateSalaryDtoSchema } from '../../application/auth/dtos/user.dto';

// ─── Classes / Sessions Repositories ─────────────────────────────────────────
import { ClassPgRepo } from '../../infrastructure/db/repositories/classes/class.pg.repo';
import { ClassStaffPgRepo } from '../../infrastructure/db/repositories/classes/class-staff.pg.repo';
import { RoomPgRepo } from '../../infrastructure/db/repositories/classes/room.pg.repo';
import { ProgramPgRepo } from '../../infrastructure/db/repositories/classes/program.pg.repo';
import { SessionPgRepo as ClassSessionPgRepo } from '../../infrastructure/db/repositories/sessions/session.pg.repo';
import { SessionCoverPgRepo } from '../../infrastructure/db/repositories/sessions/session-cover.pg.repo';

// ─── Classes / Sessions Domain Services ───────────────────────────────────────
import { ConflictCheckerService } from '../../domain/classes/services/conflict-checker.service';
import { SessionGeneratorService } from '../../domain/sessions/services/session-generator.service';

// ─── Classes / Sessions Use Cases ─────────────────────────────────────────────
import { CreateClassUseCase } from '../../application/classes/usecases/create-class.usecase';
import { UpdateClassUseCase } from '../../application/classes/usecases/update-class.usecase';
import { ListClassesUseCase } from '../../application/classes/usecases/list-classes.usecase';
import { GetClassUseCase } from '../../application/classes/usecases/get-class.usecase';
import { ReplaceTeacherUseCase } from '../../application/classes/usecases/replace-teacher.usecase';
import { CloseClassUseCase } from '../../application/classes/usecases/close-class.usecase';
import { GetRosterUseCase } from '../../application/classes/usecases/get-roster.usecase';
import { ListRoomsUseCase } from '../../application/classes/usecases/list-rooms.usecase';
import { ListProgramsUseCase } from '../../application/classes/usecases/list-programs.usecase';
import { GenerateSessionsUseCase } from '../../application/sessions/usecases/generate-sessions.usecase';
import { RescheduleSessionUseCase } from '../../application/sessions/usecases/reschedule-session.usecase';
import { AssignCoverUseCase } from '../../application/sessions/usecases/assign-cover.usecase';
import { CancelCoverUseCase } from '../../application/sessions/usecases/cancel-cover.usecase';
import { ListClassSessionsUseCase } from '../../application/sessions/usecases/list-class-sessions.usecase';
import { ListTeacherSessionsUseCase } from '../../application/sessions/usecases/list-teacher-sessions.usecase';
import { FindAvailableCoversUseCase } from '../../application/sessions/usecases/find-available-covers.usecase';

// ─── Classes / Sessions DTOs ──────────────────────────────────────────────────
import { CreateClassDto, UpdateClassDto, RescheduleDto, AssignCoverDto } from '../../application/classes/dtos/class.dto';

// ─── Classes / Sessions Controllers ───────────────────────────────────────────
import { createClassController } from './controllers/classes/class.controller';
import { createSessionController } from './controllers/sessions/session.controller';
import { createRoomController } from './controllers/classes/room.controller';
import { createProgramController } from './controllers/classes/program.controller';

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENTS MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Students Repositories ────────────────────────────────────────────────────
import { StudentPgRepo } from '../../infrastructure/db/repositories/students/student.pg.repo';
import { EnrollmentPgRepo } from '../../infrastructure/db/repositories/students/enrollment.pg.repo';
import { EnrollmentHistoryPgRepo } from '../../infrastructure/db/repositories/students/enrollment-history.pg.repo';
import { PauseRequestPgRepo } from '../../infrastructure/db/repositories/students/pause-request.pg.repo';
import { AttendancePgRepo } from '../../infrastructure/db/repositories/students/attendance.pg.repo';
import { MakeupSessionPgRepo } from '../../infrastructure/db/repositories/students/makeup-session.pg.repo';
import { RefundRequestPgRepo } from '../../infrastructure/db/repositories/students/refund-request.pg.repo';

// ─── Students Use Cases ───────────────────────────────────────────────────────
import { CreateStudentUseCase } from '../../application/students/usecases/create-student.usecase';
import { ListStudentsUseCase } from '../../application/students/usecases/list-students.usecase';
import { GetStudentUseCase } from '../../application/students/usecases/get-student.usecase';
import { UpdateStudentUseCase } from '../../application/students/usecases/update-student.usecase';
import { CreateEnrollmentUseCase } from '../../application/students/usecases/create-enrollment.usecase';
import { ListEnrollmentsUseCase } from '../../application/students/usecases/list-enrollments.usecase';
import { StartTrialUseCase } from '../../application/students/usecases/start-trial.usecase';
import { ActivateEnrollmentUseCase } from '../../application/students/usecases/activate-enrollment.usecase';
import { DropEnrollmentUseCase } from '../../application/students/usecases/drop-enrollment.usecase';
import { CompleteEnrollmentUseCase } from '../../application/students/usecases/complete-enrollment.usecase';
import { PauseEnrollmentUseCase } from '../../application/students/usecases/pause-enrollment.usecase';
import { ResumeEnrollmentUseCase } from '../../application/students/usecases/resume-enrollment.usecase';
import { TransferClassUseCase } from '../../application/students/usecases/transfer-class.usecase';
import { TransferEnrollmentUseCase } from '../../application/students/usecases/transfer-enrollment.usecase';
import { ReviewPauseRequestUseCase } from '../../application/students/usecases/review-pause-request.usecase';
import { RecordAttendanceUseCase } from '../../application/students/usecases/record-attendance.usecase';
import { GetAttendanceHistoryUseCase } from '../../application/students/usecases/get-attendance-history.usecase';
import { CreateMakeupSessionUseCase } from '../../application/students/usecases/create-makeup-session.usecase';
import { CompleteMakeupSessionUseCase } from '../../application/students/usecases/complete-makeup.usecase';
import { ListMakeupSessionsUseCase } from '../../application/students/usecases/list-makeup-sessions.usecase';
import { CreateRefundRequestUseCase } from '../../application/students/usecases/create-refund-request.usecase';
import { ReviewRefundRequestUseCase } from '../../application/students/usecases/review-refund-request.usecase';
import { ListRefundRequestsUseCase } from '../../application/students/usecases/list-refund-requests.usecase';
import { EnrollmentTransitionRule } from '../../domain/students/services/enrollment-transition.rule';

// ─── Students DTOs ────────────────────────────────────────────────────────────
import { CreateStudentSchema, UpdateStudentSchema } from '../../application/students/dtos/student.dto';
import {
  ApprovePauseRequestBodySchema,
  CreateEnrollmentSchema,
  DropEnrollmentSchema,
  PauseEnrollmentSchema,
  RejectPauseRequestBodySchema,
  TransferClassSchema,
  TransferEnrollmentSchema,
} from '../../application/students/dtos/enrollment.dto';
import {
  RecordAttendanceSchema,
  CreateMakeupSessionSchema,
} from '../../application/students/dtos/attendance.dto';
import {
  CreateRefundRequestSchema,
  ReviewRefundRequestSchema,
} from '../../application/students/dtos/refund.dto';

// ─── Students Controllers ─────────────────────────────────────────────────────
import { createStudentController } from './controllers/students/students.controller';
import { createEnrollmentController } from './controllers/students/enrollments.controller';
import { createPauseRequestController } from './controllers/students/pause-requests.controller';
import { createAttendanceController } from './controllers/students/attendance.controller';
import { createMakeupSessionController } from './controllers/students/makeup-sessions.controller';
import { createRefundRequestController } from './controllers/students/refund-requests.controller';

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCE MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Finance Repositories ─────────────────────────────────────────────────────
import { ReceiptPgRepo } from '../../infrastructure/db/repositories/finance/receipt.pg.repo';
import { PayrollPgRepo } from '../../infrastructure/db/repositories/finance/payroll.pg.repo';

// ─── Finance Use Cases ────────────────────────────────────────────────────────
import { CreateReceiptUseCase } from '../../application/finance/usecases/create-receipt.usecase';
import { VoidReceiptUseCase } from '../../application/finance/usecases/void-receipt.usecase';
import { ListReceiptsUseCase } from '../../application/finance/usecases/list-receipts.usecase';
import { GetDebtUseCase } from '../../application/finance/usecases/get-debt.usecase';
import { ListPaymentStatusUseCase } from '../../application/finance/usecases/list-payment-status.usecase';
import { FinanceDashboardUseCase } from '../../application/finance/usecases/finance-dashboard.usecase';
import { PreviewPayrollUseCase } from '../../application/finance/usecases/preview-payroll.usecase';
import { FinalizePayrollUseCase } from '../../application/finance/usecases/finalize-payroll.usecase';
import { GetPayrollUseCase } from '../../application/finance/usecases/get-payroll.usecase';
import { ListPayrollsUseCase } from '../../application/finance/usecases/list-payrolls.usecase';

// ─── Finance Controllers ──────────────────────────────────────────────────────
import { createFinanceController, createPayrollController } from './controllers/finance/finance.controller';

// ─── Finance DTOs ─────────────────────────────────────────────────────────────
import { CreateReceiptSchema, PayrollPeriodSchema } from '../../application/finance/dtos/finance.dto';

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM MODULE (Audit)
// ═══════════════════════════════════════════════════════════════════════════════
import { AuditPgRepo } from '../../infrastructure/db/repositories/system/audit.pg.repo';
import { AuditWriter } from '../../application/system/usecases/audit-writer';
import { ListAuditLogsUseCase } from '../../application/system/usecases/list-audit-logs.usecase';
import { createAuditController } from './controllers/system/audit.controller';
import { DashboardStatsUseCase } from '../../application/dashboard/usecases/dashboard-stats.usecase';
import { createDashboardController } from './controllers/dashboard/dashboard.controller';

import { SearchPgRepo } from '../../infrastructure/db/repositories/system/search.pg.repo';
import { SearchStudentsUseCase } from '../../application/system/usecases/search-students.usecase';
import { SearchUsersUseCase } from '../../application/system/usecases/search-users.usecase';
import { SearchClassesUseCase } from '../../application/system/usecases/search-classes.usecase';
import { GlobalSearchUseCase } from '../../application/system/usecases/global-search.usecase';
import { createSearchController } from './controllers/system/search.controller';

import { StudentsImporter } from '../../infrastructure/excel/importers/students.importer';
import { UsersImporter } from '../../infrastructure/excel/importers/users.importer';
import { AttendanceImporter } from '../../infrastructure/excel/importers/attendance.importer';
import { EnrollmentsImporter } from '../../infrastructure/excel/importers/enrollments.importer';
import { HolidaysImporter } from '../../infrastructure/excel/importers/holidays.importer';
import { ReceiptsImporter } from '../../infrastructure/excel/importers/receipts.importer';
import { StudentsExporter } from '../../infrastructure/excel/exporters/students.exporter';
import { AttendanceSheetExporter } from '../../infrastructure/excel/exporters/attendance-sheet.exporter';
import { PayrollExporter } from '../../infrastructure/excel/exporters/payroll.exporter';
import { ReceiptsExporter } from '../../infrastructure/excel/exporters/receipts.exporter';
import { DebtReportExporter } from '../../infrastructure/excel/exporters/debt-report.exporter';
import { ClassRosterExporter } from '../../infrastructure/excel/exporters/class-roster.exporter';
import { AuditLogsCsvExporter } from '../../infrastructure/excel/exporters/audit-logs-csv.exporter';
import { ImportDataUseCase } from '../../application/system/usecases/import-data.usecase';
import { ExportDataUseCase } from '../../application/system/usecases/export-data.usecase';
import { createImportExportController } from './controllers/system/import-export.controller';

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANTIATION
// ═══════════════════════════════════════════════════════════════════════════════

const jwtProvider = new JwtProvider();
const passwordHasher = new PasswordHasher();
const rbacService = new RbacService();

// Auth / User repos
const userRepo = new UserPgRepo(db);
const roleRepo = new RolePgRepo(db);
const sessionRepo = new SessionPgRepo(db);
const auditLogRepo = new AuditLogPgRepo(db);
const salaryLogRepo = new SalaryLogPgRepo(db);

// Auth use cases
const loginUsecase = new LoginUseCase(userRepo, sessionRepo, auditLogRepo, passwordHasher, jwtProvider);
const refreshUsecase = new RefreshUseCase(sessionRepo, userRepo, jwtProvider);
const logoutUsecase = new LogoutUseCase(sessionRepo, auditLogRepo, jwtProvider);
const meUsecase = new MeUseCase(userRepo);
const createUserUsecase = new CreateUserUseCase(userRepo, roleRepo, salaryLogRepo, auditLogRepo, passwordHasher, db);
const updateUserUsecase = new UpdateUserUseCase(userRepo, auditLogRepo, db);
const updateSalaryUsecase = new UpdateSalaryUseCase(userRepo, salaryLogRepo, auditLogRepo);
const listUsersUsecase = new ListUsersUseCase(userRepo);
const getUserUsecase = new GetUserUseCase(userRepo, salaryLogRepo);
const softDeleteUserUsecase = new SoftDeleteUserUseCase(userRepo, auditLogRepo);

// Classes / Sessions repos + services
const classRepo = new ClassPgRepo(db);
const classStaffRepo = new ClassStaffPgRepo(db);
const roomRepo = new RoomPgRepo(db);
const programRepo = new ProgramPgRepo(db);
const classSessionRepo = new ClassSessionPgRepo(db);
const sessionCoverRepo = new SessionCoverPgRepo(db);
const conflictCheckerService = new ConflictCheckerService(db);
const sessionGeneratorService = new SessionGeneratorService();

// Classes / Sessions use cases
const createClassUsecase = new CreateClassUseCase(classRepo, classStaffRepo, programRepo, roomRepo, userRepo, conflictCheckerService, auditLogRepo);
const updateClassUsecase = new UpdateClassUseCase(classRepo, classStaffRepo, conflictCheckerService);
const listClassesUsecase = new ListClassesUseCase(classRepo);
const getClassUsecase = new GetClassUseCase(classRepo, classStaffRepo);
const replaceTeacherUsecase = new ReplaceTeacherUseCase(
  classRepo,
  classStaffRepo,
  userRepo,
  classSessionRepo,
  conflictCheckerService,
  auditLogRepo,
  db,
);
const closeClassUsecase = new CloseClassUseCase(classRepo, classSessionRepo, auditLogRepo);
const listRoomsUsecase = new ListRoomsUseCase(roomRepo);
const listProgramsUsecase = new ListProgramsUseCase(programRepo);
const generateSessionsUsecase = new GenerateSessionsUseCase(classRepo, classStaffRepo, classSessionRepo, holidayRepo, programRepo, auditLogRepo, sessionGeneratorService);
const rescheduleSessionUsecase = new RescheduleSessionUseCase(classSessionRepo, classRepo, conflictCheckerService, holidayRepo, auditLogRepo);
const assignCoverUsecase = new AssignCoverUseCase(
  classSessionRepo,
  sessionCoverRepo,
  userRepo,
  auditLogRepo,
  conflictCheckerService,
);
const cancelCoverUsecase = new CancelCoverUseCase(sessionCoverRepo, auditLogRepo);
const listClassSessionsUsecase = new ListClassSessionsUseCase(
  classSessionRepo,
  sessionCoverRepo,
  userRepo,
  classRepo,
);
const listTeacherSessionsUsecase = new ListTeacherSessionsUseCase(
  classSessionRepo,
  sessionCoverRepo,
  classRepo,
  userRepo,
);
const findAvailableCoversUsecase = new FindAvailableCoversUseCase(
  classSessionRepo,
  userRepo,
  conflictCheckerService,
);

// Students repos
const studentRepo = new StudentPgRepo(db);
const enrollmentRepo = new EnrollmentPgRepo(db);
const enrollmentHistoryRepo = new EnrollmentHistoryPgRepo(db);
const pauseRequestRepo = new PauseRequestPgRepo(db);
const attendanceRepo = new AttendancePgRepo(db);
const makeupSessionRepo = new MakeupSessionPgRepo(db);
const refundRequestRepo = new RefundRequestPgRepo(db);

// Students use cases
const enrollmentTransitionRule = new EnrollmentTransitionRule();
// Finance check service — wired via real receiptRepo once instantiated below
// Placeholder used here; actual receipt sum checked inside CreateReceiptUseCase auto-activation
const financeCheckServicePlaceholder = {
  checkSufficientReceipt: async (_enrollmentId: string, _amount: number) => true,
};

const createStudentUsecase = new CreateStudentUseCase(studentRepo, auditLogRepo, db);
const listStudentsUsecase = new ListStudentsUseCase(studentRepo);
const getStudentUsecase = new GetStudentUseCase(studentRepo);
const updateStudentUsecase = new UpdateStudentUseCase(studentRepo, auditLogRepo, db);

// CreateEnrollmentUseCase(studentRepo, enrollmentRepo, enrollmentHistoryRepo, classRepo, programRepo, auditLogRepo)
const createEnrollmentUsecase = new CreateEnrollmentUseCase(studentRepo, enrollmentRepo, enrollmentHistoryRepo, classRepo, programRepo, auditLogRepo);
const listEnrollmentsUsecase = new ListEnrollmentsUseCase(enrollmentRepo, pauseRequestRepo);
const startTrialUsecase = new StartTrialUseCase(enrollmentRepo, enrollmentHistoryRepo, enrollmentTransitionRule);
const activateEnrollmentUsecase = new ActivateEnrollmentUseCase(
  enrollmentRepo,
  enrollmentHistoryRepo,
  enrollmentTransitionRule,
  financeCheckServicePlaceholder,
  studentRepo,
  auditLogRepo,
);
const dropEnrollmentUsecase = new DropEnrollmentUseCase(
  enrollmentRepo,
  enrollmentHistoryRepo,
  enrollmentTransitionRule,
  studentRepo,
  auditLogRepo,
);
// CompleteEnrollmentUseCase(studentRepo, enrollmentRepo, enrollmentHistoryRepo, programRepo, auditLogRepo)
const completeEnrollmentUsecase = new CompleteEnrollmentUseCase(
  studentRepo,
  enrollmentRepo,
  enrollmentHistoryRepo,
  programRepo,
  auditLogRepo,
);
// PauseEnrollmentUseCase(enrollmentRepo, enrollmentHistoryRepo, pauseRequestRepo, studentRepo, auditLogRepo)
const pauseEnrollmentUsecase = new PauseEnrollmentUseCase(
  enrollmentRepo,
  enrollmentHistoryRepo,
  pauseRequestRepo,
  studentRepo,
  auditLogRepo,
);
const resumeEnrollmentUsecase = new ResumeEnrollmentUseCase(
  enrollmentRepo,
  enrollmentHistoryRepo,
  studentRepo,
  auditLogRepo,
);
// TransferClassUseCase(enrollmentRepo, enrollmentHistoryRepo, classRepo, auditLogRepo)
const transferClassUsecase = new TransferClassUseCase(enrollmentRepo, enrollmentHistoryRepo, classRepo, auditLogRepo);
// ReviewPauseRequestUseCase(enrollmentRepo, enrollmentHistoryRepo, pauseRequestRepo)
const reviewPauseRequestUsecase = new ReviewPauseRequestUseCase(enrollmentRepo, enrollmentHistoryRepo, pauseRequestRepo);
const getRosterUsecase = new GetRosterUseCase(enrollmentRepo);

const recordAttendanceUsecase = new RecordAttendanceUseCase(
  attendanceRepo,
  classSessionRepo,
  sessionCoverRepo,
  enrollmentRepo,
  auditLogRepo,
);
const getAttendanceHistoryUsecase = new GetAttendanceHistoryUseCase(attendanceRepo);

const createMakeupSessionUsecase = new CreateMakeupSessionUseCase(
  makeupSessionRepo,
  attendanceRepo,
  enrollmentRepo,
  auditLogRepo,
  classSessionRepo,
  conflictCheckerService,
);
const completeMakeupSessionUsecase = new CompleteMakeupSessionUseCase(makeupSessionRepo, enrollmentRepo, auditLogRepo);
const listMakeupSessionsUsecase = new ListMakeupSessionsUseCase(makeupSessionRepo);

const createRefundRequestUsecase = new CreateRefundRequestUseCase(refundRequestRepo, enrollmentRepo, enrollmentHistoryRepo, auditLogRepo);
const reviewRefundRequestUsecase = new ReviewRefundRequestUseCase(refundRequestRepo, enrollmentRepo, enrollmentHistoryRepo, auditLogRepo);
const listRefundRequestsUsecase = new ListRefundRequestsUseCase(refundRequestRepo);

const transferEnrollmentUsecase = new TransferEnrollmentUseCase(db);

// ─── System (Audit) repos + services ─────────────────────────────────────────
const auditSystemRepo      = new AuditPgRepo(db);
export const auditWriter   = new AuditWriter(auditSystemRepo);
const listAuditLogsUsecase = new ListAuditLogsUseCase(auditSystemRepo);
const auditController      = createAuditController(listAuditLogsUsecase);

// ─── System (Search) repos + services ─────────────────────────────────────────
const searchRepo = new SearchPgRepo(db);
const searchStudentsUseCase = new SearchStudentsUseCase(searchRepo);
const searchUsersUseCase = new SearchUsersUseCase(searchRepo);
const searchClassesUseCase = new SearchClassesUseCase(searchRepo);
const globalSearchUseCase = new GlobalSearchUseCase(searchStudentsUseCase, searchUsersUseCase, searchClassesUseCase);
const searchController = createSearchController(globalSearchUseCase, searchStudentsUseCase, searchUsersUseCase, searchClassesUseCase);

// ─── Finance repos ────────────────────────────────────────────────────────────
const receiptRepo = new ReceiptPgRepo(db);
const payrollRepo = new PayrollPgRepo(db);

// ─── Finance use cases ────────────────────────────────────────────────────────
// createReceiptUsecase declared after activateEnrollmentUsecase to wire the callback
const getDebtUsecase            = new GetDebtUseCase(receiptRepo, enrollmentRepo);
const listReceiptsUsecase       = new ListReceiptsUseCase(receiptRepo);
const listPaymentStatusUsecase  = new ListPaymentStatusUseCase(receiptRepo, enrollmentRepo, studentRepo, db);
const financeDashboardUsecase   = new FinanceDashboardUseCase(db);
const previewPayrollUsecase     = new PreviewPayrollUseCase(payrollRepo, db);
const listPayrollsUsecase       = new ListPayrollsUseCase(payrollRepo);
const getPayrollUsecase         = new GetPayrollUseCase(payrollRepo, db);

// activateEnrollmentFn callback — breaks circular dep between receipt & activate
const activateEnrollmentFn = async (enrollmentId: string, act: { id: string }) =>
  activateEnrollmentUsecase.execute(enrollmentId, act);

const createReceiptUsecase = new CreateReceiptUseCase(
  receiptRepo,
  enrollmentRepo,
  auditLogRepo,
  activateEnrollmentFn,
);
const voidReceiptUsecase = new VoidReceiptUseCase(receiptRepo, createReceiptUsecase);
const finalizePayrollUsecase = new FinalizePayrollUseCase(payrollRepo, previewPayrollUsecase, auditLogRepo, db);

// ─── Controllers ──────────────────────────────────────────────────────────────
const authController = createAuthController(loginUsecase, refreshUsecase, logoutUsecase, meUsecase);
const userController = createUserController(createUserUsecase, updateUserUsecase, updateSalaryUsecase, listUsersUsecase, getUserUsecase, softDeleteUserUsecase);

const classController = createClassController(createClassUsecase, getClassUsecase, updateClassUsecase, generateSessionsUsecase, replaceTeacherUsecase, closeClassUsecase, getRosterUsecase, listClassSessionsUsecase, listClassesUsecase);
const sessionController = createSessionController(
  rescheduleSessionUsecase,
  assignCoverUsecase,
  cancelCoverUsecase,
  listTeacherSessionsUsecase,
  findAvailableCoversUsecase,
  classSessionRepo,
  sessionCoverRepo,
  attendanceRepo,
  userRepo,
  classRepo,
);
const roomController = createRoomController(listRoomsUsecase);
const programController = createProgramController(listProgramsUsecase);

const studentController = createStudentController(createStudentUsecase, listStudentsUsecase, getStudentUsecase, updateStudentUsecase);
const enrollmentController = createEnrollmentController(
  createEnrollmentUsecase,
  startTrialUsecase,
  activateEnrollmentUsecase,
  dropEnrollmentUsecase,
  completeEnrollmentUsecase,
  pauseEnrollmentUsecase,
  resumeEnrollmentUsecase,
  transferClassUsecase,
  transferEnrollmentUsecase,
  listEnrollmentsUsecase,
);
const pauseRequestController = createPauseRequestController(
  reviewPauseRequestUsecase,
  { execute: async (p: any) => pauseRequestRepo.findPagedByStatus(p.status ?? 'pending', p.page, p.limit) },
);
const attendanceController = createAttendanceController(recordAttendanceUsecase, getAttendanceHistoryUsecase);
const makeupSessionController = createMakeupSessionController(createMakeupSessionUsecase, completeMakeupSessionUsecase, listMakeupSessionsUsecase);
const refundRequestController = createRefundRequestController(createRefundRequestUsecase, reviewRefundRequestUsecase, listRefundRequestsUsecase);

const financeController = createFinanceController(
  createReceiptUsecase,
  voidReceiptUsecase,
  listReceiptsUsecase,
  receiptRepo,
  getDebtUsecase,
  listPaymentStatusUsecase,
  financeDashboardUsecase,
);
const payrollController = createPayrollController(
  previewPayrollUsecase,
  finalizePayrollUsecase,
  listPayrollsUsecase,
  getPayrollUsecase,
);

// ─── Import/Export repos + services ───────────────────────────────────────────
const studentsImporter = new StudentsImporter(db);
const usersImporter = new UsersImporter();
const enrollmentsImporter = new EnrollmentsImporter(db);
const holidaysImporter = new HolidaysImporter(db);
const receiptsImporter = new ReceiptsImporter(db);
const attendanceImporter = new AttendanceImporter(async (sessionId, studentCode) => {
  const sid = sessionId.trim();
  const code = studentCode.trim();
  const sessRes = await db.query(`SELECT class_id FROM sessions WHERE id = $1`, [sid]);
  if (!sessRes.rows[0]) {
    return { isValid: false, reason: 'Không tìm thấy buổi học' };
  }
  const classId = sessRes.rows[0].class_id as string;
  const stRes = await db.query(
    `SELECT id FROM students WHERE student_code = $1 AND deleted_at IS NULL`,
    [code],
  );
  if (!stRes.rows[0]) {
    return { isValid: false, reason: 'Không tìm thấy học viên' };
  }
  const studentId = stRes.rows[0].id as string;
  const enrRes = await db.query(
    `SELECT id FROM enrollments
     WHERE class_id = $1 AND student_id = $2 AND status IN ('trial', 'active', 'pending')
     ORDER BY created_at DESC LIMIT 1`,
    [classId, studentId],
  );
  if (!enrRes.rows[0]) {
    return { isValid: false, reason: 'Không có ghi danh hợp lệ cho lớp của buổi học' };
  }
  return {
    isValid: true,
    studentId,
    enrollmentId: enrRes.rows[0].id as string,
  };
});
const studentsExporter = new StudentsExporter();
const attendanceSheetExporter = new AttendanceSheetExporter();
const payrollExporter = new PayrollExporter();
const receiptsExporter = new ReceiptsExporter();
const debtReportExporter = new DebtReportExporter();
const classRosterExporter = new ClassRosterExporter();
const auditLogsCsvExporter = new AuditLogsCsvExporter();

const importDataUseCase = new ImportDataUseCase(
  db,
  studentsImporter,
  usersImporter,
  attendanceImporter,
  enrollmentsImporter,
  holidaysImporter,
  receiptsImporter,
  passwordHasher,
  auditWriter,
);
const exportDataUseCase = new ExportDataUseCase(
  db,
  studentsExporter,
  attendanceSheetExporter,
  payrollExporter,
  receiptsExporter,
  debtReportExporter,
  classRosterExporter,
  auditLogsCsvExporter,
  auditWriter,
);
const importExportController = createImportExportController(importDataUseCase, exportDataUseCase);

const dashboardStatsUsecase = new DashboardStatsUseCase(db);
const dashboardController = createDashboardController(dashboardStatsUsecase);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Shared helpers
const authenticate = authMiddleware(jwtProvider, userRepo);
const rbac = (...actions: string[]) => authorize(rbacService, ...actions);

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES WIRING
// ═══════════════════════════════════════════════════════════════════════════════

const router = Router();

// Auth
const authRouter = Router();
authRouter.post('/login', validate(LoginDtoSchema), authController.login);
authRouter.post('/refresh', validate(RefreshDtoSchema), authController.refresh);
authRouter.post('/logout', authenticate, validate(RefreshDtoSchema), authController.logout);
authRouter.get('/me', authenticate, authController.me);

// Dashboard (stats gom KPI — mọi role đã đăng nhập)
router.get('/dashboard/stats', authenticate, dashboardController.stats);

// Users
const userRouter = Router();
userRouter.get('/', authenticate, rbac('*'), userController.listUsers);
userRouter.post('/', authenticate, rbac('*'), validate(CreateUserDtoSchema), userController.createUser);
userRouter.get('/:id', authenticate, userController.getUser);
userRouter.patch('/:id', authenticate, validate(UpdateUserDtoSchema), userController.updateUser);
userRouter.delete('/:id', authenticate, rbac('*'), userController.softDeleteUser);
userRouter.patch('/:id/salary', authenticate, rbac('*'), validate(UpdateSalaryDtoSchema), userController.updateSalary);
userRouter.get('/:id/salary-logs', authenticate, rbac('*'), userController.getSalaryLogs);

// Classes
const classRouter = Router();
classRouter.get('/', authenticate, classController.listClasses);
classRouter.post('/', authenticate, rbac('class:create'), validate(CreateClassDto), classController.createClass);
classRouter.get('/:id', authenticate, classController.getClass);
classRouter.patch('/:id', authenticate, rbac('class:update'), validate(UpdateClassDto), classController.updateClass);
classRouter.post('/:id/generate-sessions', authenticate, rbac('class:create'), classController.generateSessions);
classRouter.post('/:id/replace-teacher', authenticate, rbac('*'), classController.replaceTeacher);
classRouter.post('/:id/close', authenticate, rbac('class:update'), classController.closeClass);
classRouter.get('/:id/roster', authenticate, classController.getRoster);
classRouter.get('/:id/sessions', authenticate, classController.listClassSessions);

// Sessions (attendance nested here)
const sessionRouter = Router();
sessionRouter.get(
  '/:id',
  authenticate,
  rbac('session:read_own', 'class:read', '*'),
  requireOwnSession(classSessionRepo, sessionCoverRepo),
  sessionController.getSession,
);
sessionRouter.patch('/:id/reschedule', authenticate, rbac('class:reschedule'), validate(RescheduleDto), sessionController.reschedule);
sessionRouter.get('/:id/available-covers', authenticate, rbac('class:assign_cover'), sessionController.findAvailableCovers);
sessionRouter.post('/:id/cover', authenticate, rbac('class:assign_cover'), validate(AssignCoverDto), sessionController.assignCover);
sessionRouter.delete('/:id/cover', authenticate, rbac('class:assign_cover'), sessionController.cancelCover);
sessionRouter.post(
  '/:id/attendance',
  authenticate,
  rbac('attendance:record'),
  requireOwnSession(classSessionRepo, sessionCoverRepo),
  validate(RecordAttendanceSchema),
  attendanceController.recordAttendance,
);

// Rooms / Programs
const roomRouter = Router();
roomRouter.get('/', authenticate, roomController.listRooms);

const programRouter = Router();
programRouter.get('/', authenticate, programController.listPrograms);

// Students (enrollment history nested)
const studentRouter = Router();
studentRouter.get('/', authenticate, rbac('student:read'), studentController.listStudents);
studentRouter.post('/', authenticate, rbac('student:create'), validate(CreateStudentSchema), studentController.createStudent);
studentRouter.get('/:id', authenticate, rbac('student:read'), studentController.getStudent);
studentRouter.patch('/:id', authenticate, rbac('student:update'), validate(UpdateStudentSchema), studentController.updateStudent);
studentRouter.get('/:id/enrollments', authenticate, rbac('enrollment:read'), enrollmentController.listStudentEnrollments);

// Enrollments (attendance history nested)
const enrollmentRouter = Router();
// NOTE: /transfer must be declared before /:id routes to avoid param collision
enrollmentRouter.post('/transfer', authenticate, rbac('*'), validate(TransferEnrollmentSchema), enrollmentController.transferEnrollment);
enrollmentRouter.post('/', authenticate, rbac('enrollment:create'), validate(CreateEnrollmentSchema), enrollmentController.createEnrollment);
enrollmentRouter.post('/:id/start-trial', authenticate, rbac('enrollment:create'), enrollmentController.startTrial);
enrollmentRouter.post('/:id/activate', authenticate, rbac('enrollment:create'), enrollmentController.activateEnrollment);
enrollmentRouter.post('/:id/drop', authenticate, rbac('enrollment:create'), validate(DropEnrollmentSchema), enrollmentController.dropEnrollment);
enrollmentRouter.post('/:id/complete', authenticate, rbac('enrollment:create'), enrollmentController.completeEnrollment);
enrollmentRouter.post('/:id/pause', authenticate, rbac('pause_request:create'), validate(PauseEnrollmentSchema), enrollmentController.pauseEnrollment);
enrollmentRouter.post('/:id/resume', authenticate, rbac('enrollment:create'), enrollmentController.resumeEnrollment);
enrollmentRouter.post('/:id/transfer-class', authenticate, rbac('enrollment:transfer_class'), validate(TransferClassSchema), enrollmentController.transferClass);
enrollmentRouter.get('/:id/attendance', authenticate, rbac('attendance:record', 'enrollment:read'), attendanceController.getAttendanceHistory);

// Pause Requests
const pauseRequestRouter = Router();
pauseRequestRouter.get('/', authenticate, rbac('*'), pauseRequestController.listPending);
pauseRequestRouter.patch(
  '/:id/approve',
  authenticate,
  rbac('*'),
  validate(ApprovePauseRequestBodySchema),
  pauseRequestController.approve,
);
pauseRequestRouter.patch(
  '/:id/reject',
  authenticate,
  rbac('*'),
  validate(RejectPauseRequestBodySchema),
  pauseRequestController.reject,
);

// Makeup Sessions
const makeupSessionRouter = Router();
makeupSessionRouter.get('/', authenticate, rbac('makeup:create', 'makeup:read_own'), makeupSessionController.listMakeupSessions);
makeupSessionRouter.post('/', authenticate, rbac('makeup:create'), validate(CreateMakeupSessionSchema), makeupSessionController.createMakeup);
makeupSessionRouter.patch('/:id/complete', authenticate, rbac('makeup:create'), makeupSessionController.completeMakeup);

// Refund Requests
const refundRequestRouter = Router();
refundRequestRouter.post('/', authenticate, rbac('receipt:create', '*'), validate(CreateRefundRequestSchema), refundRequestController.createRefund);
refundRequestRouter.get('/', authenticate, rbac('receipt:create', '*'), refundRequestController.listRefunds);
refundRequestRouter.patch('/:id/approve', authenticate, rbac('receipt:create', '*'), refundRequestController.approveRefund);
refundRequestRouter.patch('/:id/reject', authenticate, rbac('receipt:create', '*'), validate(ReviewRefundRequestSchema), refundRequestController.rejectRefund);

// ─── Mount ────────────────────────────────────────────────────────────────────
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/classes', classRouter);
router.use('/sessions', sessionRouter);
router.use('/rooms', roomRouter);
router.use('/programs', programRouter);
router.get('/my-sessions', authenticate, sessionController.listTeacherSessions);
router.use('/students', studentRouter);
router.use('/enrollments', enrollmentRouter);
router.use('/pause-requests', pauseRequestRouter);
router.use('/makeup-sessions', makeupSessionRouter);
router.use('/refund-requests', refundRequestRouter);

// ── Finance routes ────────────────────────────────────────────────────────────
const receiptRouter = Router();
receiptRouter.post('/', authenticate, rbac('receipt:create'), validate(CreateReceiptSchema), financeController.createReceipt);
receiptRouter.post('/:id/void', authenticate, rbac('receipt:void'), financeController.voidReceipt);
receiptRouter.get('/', authenticate, rbac('receipt:create'), financeController.listReceipts);
receiptRouter.get('/:id', authenticate, rbac('receipt:create'), financeController.getReceipt);
router.use('/receipts', receiptRouter);

// debt is nested under enrollments
router.get('/enrollments/:id/debt', authenticate, rbac('debt:read', 'enrollment:read'), financeController.getDebt);

const financeRouter = Router();
financeRouter.get('/payment-status', authenticate, rbac('debt:read'), financeController.listPaymentStatus);
financeRouter.get('/dashboard', authenticate, rbac('finance:dashboard'), financeController.financeDashboard);
router.use('/finance', financeRouter);

// ── Payroll routes ────────────────────────────────────────────────────────────
const payrollRouter = Router();
// NOTE: /preview and /finalize must be declared before /:id to avoid param collision
payrollRouter.get('/preview', authenticate, rbac('payroll:finalize', 'payroll:read'), payrollController.previewPayroll);
payrollRouter.post('/finalize', authenticate, rbac('payroll:finalize'), validate(PayrollPeriodSchema), payrollController.finalizePayroll);
payrollRouter.get('/', authenticate, rbac('payroll:read', 'payroll:read_own'), payrollController.listPayrolls);
payrollRouter.get(
  '/:id',
  authenticate,
  rbac('payroll:read', 'payroll:read_own', '*'),
  requireOwnPayroll(payrollRepo),
  payrollController.getPayroll,
);
router.use('/payroll', payrollRouter);

// ── Audit Logs routes (ADMIN only) ───────────────────────────────────────────
const auditRouter = Router();
auditRouter.get('/', authenticate, rbac('*'), auditController.listAuditLogs);
router.use('/audit-logs', auditRouter);

// ── Search routes ────────────────────────────────────────────────────────────
const searchRouter = Router();
searchRouter.get('/', authenticate, searchController.globalSearch);
searchRouter.get('/students', authenticate, rbac('search:all', 'student:read'), searchController.searchStudents);
searchRouter.get('/users', authenticate, rbac('*'), searchController.searchUsers);
searchRouter.get('/classes', authenticate, searchController.searchClasses);
router.use('/search', searchRouter);

// ── Notifications (stub — chưa có bảng; tránh 404 từ FE) ───────────────────────
router.get('/notifications', authenticate, (_req, res) => {
  res.status(200).json({ data: [], unreadCount: 0 });
});
router.post('/notifications/read-all', authenticate, (_req, res) => {
  res.status(200).json({ data: { ok: true } });
});

// ── Import/Export routes ────────────────────────────────────────────────────────
const importExportRouter = Router();
importExportRouter.get('/templates/:type', authenticate, importExportController.getTemplate);
importExportRouter.post('/import/:type', authenticate, rbac('*'), upload.single('file'), importExportController.importData);
importExportRouter.get('/export/:type', authenticate, rbac('*'), importExportController.exportData);
router.use('/', importExportRouter);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;

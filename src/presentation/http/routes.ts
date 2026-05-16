import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { db, holidayRepo } from '../../bootstrap/container';
import { createHealthHandler } from './health.controller';
import { sendErrorResponse } from './utils/http-error.util';
import { ERROR_CODES } from '../../shared/errors/error-codes';

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
import { AnnounceClassUseCase } from '../../application/classes/usecases/announce-class.usecase';
import { ListUpcomingClassesUseCase } from '../../application/classes/usecases/list-upcoming-classes.usecase';
import { GetRosterUseCase } from '../../application/classes/usecases/get-roster.usecase';
import { ListRoomsUseCase } from '../../application/classes/usecases/list-rooms.usecase';
import { ListProgramsUseCase } from '../../application/classes/usecases/list-programs.usecase';
import { GenerateSessionsUseCase } from '../../application/sessions/usecases/generate-sessions.usecase';
import { RescheduleSessionUseCase } from '../../application/sessions/usecases/reschedule-session.usecase';
import { AssignCoverUseCase } from '../../application/sessions/usecases/assign-cover.usecase';
import { CancelCoverUseCase } from '../../application/sessions/usecases/cancel-cover.usecase';
import { ListClassSessionsUseCase } from '../../application/sessions/usecases/list-class-sessions.usecase';
import { GetClassAttendanceMatrixUseCase } from '../../application/classes/usecases/get-class-attendance-matrix.usecase';
import { ListTeacherSessionsUseCase } from '../../application/sessions/usecases/list-teacher-sessions.usecase';
import { ListCenterSessionsUseCase } from '../../application/sessions/usecases/list-center-sessions.usecase';
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
import { CancelReservationUseCase } from '../../application/students/usecases/cancel-reservation.usecase';
import { ReassignReservedClassUseCase } from '../../application/students/usecases/reassign-reserved-class.usecase';
import { TransferReservationUseCase } from '../../application/students/usecases/transfer-reservation.usecase';
import { CompleteEnrollmentUseCase } from '../../application/students/usecases/complete-enrollment.usecase';
import { PauseEnrollmentUseCase } from '../../application/students/usecases/pause-enrollment.usecase';
import { ResumeEnrollmentUseCase } from '../../application/students/usecases/resume-enrollment.usecase';
import { TransferClassUseCase } from '../../application/students/usecases/transfer-class.usecase';
import { TransferEnrollmentUseCase } from '../../application/students/usecases/transfer-enrollment.usecase';
import { ReviewPauseRequestUseCase } from '../../application/students/usecases/review-pause-request.usecase';
import { ResetMakeupBlockedUseCase } from '../../application/students/usecases/reset-makeup-blocked.usecase';
import { UpgradeProgramUseCase } from '../../application/students/usecases/upgrade-program.usecase';
import { RecordAttendanceUseCase } from '../../application/students/usecases/record-attendance.usecase';
import { EditAttendanceUseCase } from '../../application/students/usecases/edit-attendance.usecase';
import { GetAttendanceHistoryUseCase } from '../../application/students/usecases/get-attendance-history.usecase';
import { GetSessionAttendanceStatusUseCase } from '../../application/students/usecases/get-session-attendance-status.usecase';
import { GetSessionAttendanceHistoryUseCase } from '../../application/students/usecases/get-session-attendance-history.usecase';
import { CreateMakeupSessionUseCase } from '../../application/students/usecases/create-makeup-session.usecase';
import { CompleteMakeupSessionUseCase } from '../../application/students/usecases/complete-makeup.usecase';
import { ListMakeupSessionsUseCase } from '../../application/students/usecases/list-makeup-sessions.usecase';
import { PreviewMakeupConflictUseCase } from '../../application/students/usecases/preview-makeup-conflict.usecase';
import { CreateRefundRequestUseCase } from '../../application/students/usecases/create-refund-request.usecase';
import { ExpireReservedEnrollmentsUseCase } from '../../application/students/usecases/expire-reserved-enrollments.usecase';
import { ReviewRefundRequestUseCase } from '../../application/students/usecases/review-refund-request.usecase';
import { ListRefundRequestsUseCase } from '../../application/students/usecases/list-refund-requests.usecase';
import { EnrollmentTransitionRule } from '../../domain/students/services/enrollment-transition.rule';

// ─── Students DTOs ────────────────────────────────────────────────────────────
import { CreateStudentSchema, UpdateStudentSchema } from '../../application/students/dtos/student.dto';
import {
  ApprovePauseRequestBodySchema,
  CreateEnrollmentSchema,
  CancelReservationBodySchema,
  DropEnrollmentBodySchema,
  PauseEnrollmentBodySchema,
  ReassignReservedClassBodySchema,
  RejectPauseRequestBodySchema,
  ResetMakeupBlockedBodySchema,
  ResumeEnrollmentSchema,
  TransferClassBodySchema,
  TransferReservationBodySchema,
  TransferEnrollmentSchema,
} from '../../application/students/dtos/enrollment.dto';
import {
  RecordAttendanceBodySchema,
  CreateMakeupSessionSchema,
} from '../../application/students/dtos/attendance.dto';
import {
  CreateRefundRequestSchema,
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
import { UpdatePayrollNotesUseCase } from '../../application/finance/usecases/update-payroll-notes.usecase';
import { GetPayrollUseCase } from '../../application/finance/usecases/get-payroll.usecase';
import { ListUnfinalizedPayrollUseCase } from '../../application/finance/usecases/list-unfinalized-payroll.usecase';
import { ListPayrollsUseCase } from '../../application/finance/usecases/list-payrolls.usecase';

// ─── Finance Controllers ──────────────────────────────────────────────────────
import { createFinanceController, createPayrollController } from './controllers/finance/finance.controller';

// ─── Finance DTOs ─────────────────────────────────────────────────────────────
import {
  CreateReceiptSchema,
  PayrollNotesBodySchema,
  PayrollPeriodSchema,
} from '../../application/finance/dtos/finance.dto';

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
const refreshUsecase = new RefreshUseCase(sessionRepo, userRepo, jwtProvider, auditLogRepo);
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
const getClassUsecase = new GetClassUseCase(classRepo, classStaffRepo, db);
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
const announceClassUsecase = new AnnounceClassUseCase(classRepo);
const listUpcomingClassesUsecase = new ListUpcomingClassesUseCase(classRepo);
const listRoomsUsecase = new ListRoomsUseCase(roomRepo);
const listProgramsUsecase = new ListProgramsUseCase(programRepo);
const generateSessionsUsecase = new GenerateSessionsUseCase(classRepo, classStaffRepo, classSessionRepo, holidayRepo, programRepo, auditLogRepo, sessionGeneratorService, db);
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
  db,
);
const listCenterSessionsUsecase = new ListCenterSessionsUseCase(db);
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
const createEnrollmentUsecase = new CreateEnrollmentUseCase(
  studentRepo,
  enrollmentRepo,
  enrollmentHistoryRepo,
  classRepo,
  programRepo,
  auditLogRepo,
  db,
);
const listEnrollmentsUsecase = new ListEnrollmentsUseCase(enrollmentRepo, pauseRequestRepo);
const startTrialUsecase = new StartTrialUseCase(enrollmentRepo, enrollmentHistoryRepo, enrollmentTransitionRule, db);
const activateEnrollmentUsecase = new ActivateEnrollmentUseCase(
  enrollmentRepo,
  enrollmentHistoryRepo,
  enrollmentTransitionRule,
  financeCheckServicePlaceholder,
  studentRepo,
  auditLogRepo,
  db,
);
const dropEnrollmentUsecase = new DropEnrollmentUseCase(
  enrollmentRepo,
  enrollmentHistoryRepo,
  enrollmentTransitionRule,
  studentRepo,
  auditLogRepo,
  db,
);
// CompleteEnrollmentUseCase(studentRepo, enrollmentRepo, enrollmentHistoryRepo, programRepo, auditLogRepo)
const completeEnrollmentUsecase = new CompleteEnrollmentUseCase(
  studentRepo,
  enrollmentRepo,
  enrollmentHistoryRepo,
  programRepo,
  auditLogRepo,
  db,
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
  classRepo,
  studentRepo,
  auditLogRepo,
);
// TransferClassUseCase(enrollmentRepo, enrollmentHistoryRepo, classRepo, auditLogRepo)
const transferClassUsecase = new TransferClassUseCase(enrollmentRepo, enrollmentHistoryRepo, classRepo, auditLogRepo);
const cancelReservationUsecase = new CancelReservationUseCase(
  enrollmentRepo,
  enrollmentHistoryRepo,
  enrollmentTransitionRule,
  studentRepo,
  auditLogRepo,
);
const reassignReservedClassUsecase = new ReassignReservedClassUseCase(
  enrollmentRepo,
  enrollmentHistoryRepo,
  classRepo,
  auditLogRepo,
);
const transferReservationUsecase = new TransferReservationUseCase(db);
// ReviewPauseRequestUseCase(enrollmentRepo, enrollmentHistoryRepo, pauseRequestRepo)
const reviewPauseRequestUsecase = new ReviewPauseRequestUseCase(
  enrollmentRepo,
  enrollmentHistoryRepo,
  pauseRequestRepo,
  studentRepo,
  auditLogRepo,
);
const resetMakeupBlockedUsecase = new ResetMakeupBlockedUseCase(
  enrollmentRepo,
  studentRepo,
  auditLogRepo,
);
const getRosterUsecase = new GetRosterUseCase(enrollmentRepo, db);

const recordAttendanceUsecase = new RecordAttendanceUseCase(
  attendanceRepo,
  classSessionRepo,
  classRepo,
  auditLogRepo,
);
const getAttendanceHistoryUsecase = new GetAttendanceHistoryUseCase(attendanceRepo);
const editAttendanceUsecase = new EditAttendanceUseCase(
  attendanceRepo,
  classSessionRepo,
  classRepo,
  auditLogRepo,
);
const getSessionAttendanceStatusUsecase = new GetSessionAttendanceStatusUseCase(db);
const getSessionAttendanceHistoryUsecase = new GetSessionAttendanceHistoryUseCase(db);

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
const previewMakeupConflictUsecase = new PreviewMakeupConflictUseCase(conflictCheckerService);
const getClassAttendanceMatrixUsecase = new GetClassAttendanceMatrixUseCase(
  classRepo,
  enrollmentRepo,
  classSessionRepo,
  attendanceRepo,
  db,
);

let reviewRefundRequestUsecase: ReviewRefundRequestUseCase;
const listRefundRequestsUsecase = new ListRefundRequestsUseCase(refundRequestRepo);

const transferEnrollmentUsecase = new TransferEnrollmentUseCase(db);
const upgradeProgramUsecase = new UpgradeProgramUseCase(db);
const expireReservedEnrollmentsUsecase = new ExpireReservedEnrollmentsUseCase(db);

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
const globalSearchUseCase = new GlobalSearchUseCase(searchRepo);
const searchController = createSearchController(globalSearchUseCase, searchStudentsUseCase, searchUsersUseCase, searchClassesUseCase);

// ─── Finance repos ────────────────────────────────────────────────────────────
const receiptRepo = new ReceiptPgRepo(db);
const payrollRepo = new PayrollPgRepo(db);

const createRefundRequestUsecase = new CreateRefundRequestUseCase(
  refundRequestRepo,
  enrollmentRepo,
  enrollmentHistoryRepo,
  auditLogRepo,
  receiptRepo,
);

// ─── Finance use cases ────────────────────────────────────────────────────────
// createReceiptUsecase declared after activateEnrollmentUsecase to wire the callback
const getDebtUsecase            = new GetDebtUseCase(receiptRepo, enrollmentRepo, studentRepo, classRepo);
const listReceiptsUsecase       = new ListReceiptsUseCase(receiptRepo);
const listPaymentStatusUsecase  = new ListPaymentStatusUseCase(db);
const financeDashboardUsecase   = new FinanceDashboardUseCase(db);
const previewPayrollUsecase     = new PreviewPayrollUseCase(payrollRepo, db);
const listPayrollsUsecase       = new ListPayrollsUseCase(payrollRepo);
const getPayrollUsecase         = new GetPayrollUseCase(payrollRepo, db);
const listUnfinalizedPayrollUsecase = new ListUnfinalizedPayrollUseCase(db, previewPayrollUsecase);

// activateEnrollmentFn callback — breaks circular dep between receipt & activate
const activateEnrollmentFn = async (enrollmentId: string, act: { id: string }) =>
  activateEnrollmentUsecase.execute(enrollmentId, act);

const createReceiptUsecase = new CreateReceiptUseCase(
  receiptRepo,
  enrollmentRepo,
  auditLogRepo,
  activateEnrollmentFn,
);
const voidReceiptUsecase = new VoidReceiptUseCase(receiptRepo, createReceiptUsecase, auditLogRepo);
const finalizePayrollUsecase = new FinalizePayrollUseCase(payrollRepo, previewPayrollUsecase, auditLogRepo, db);
const updatePayrollNotesUsecase = new UpdatePayrollNotesUseCase(payrollRepo, auditLogRepo);
reviewRefundRequestUsecase = new ReviewRefundRequestUseCase(
  refundRequestRepo,
  enrollmentRepo,
  enrollmentHistoryRepo,
  studentRepo,
  receiptRepo,
  auditLogRepo,
);

// ─── Controllers ──────────────────────────────────────────────────────────────
const authController = createAuthController(loginUsecase, refreshUsecase, logoutUsecase, meUsecase);
const userController = createUserController(createUserUsecase, updateUserUsecase, updateSalaryUsecase, listUsersUsecase, getUserUsecase, softDeleteUserUsecase);

const classController = createClassController(
  createClassUsecase,
  getClassUsecase,
  updateClassUsecase,
  generateSessionsUsecase,
  replaceTeacherUsecase,
  closeClassUsecase,
  announceClassUsecase,
  listUpcomingClassesUsecase,
  getRosterUsecase,
  listClassSessionsUsecase,
  listClassesUsecase,
  getClassAttendanceMatrixUsecase,
  classRepo,
);
const sessionController = createSessionController(
  rescheduleSessionUsecase,
  assignCoverUsecase,
  cancelCoverUsecase,
  listTeacherSessionsUsecase,
  listCenterSessionsUsecase,
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
  upgradeProgramUsecase,
  listEnrollmentsUsecase,
  resetMakeupBlockedUsecase,
  cancelReservationUsecase,
  reassignReservedClassUsecase,
  transferReservationUsecase,
);
const pauseRequestController = createPauseRequestController(
  reviewPauseRequestUsecase,
  { execute: async (p: any) => pauseRequestRepo.findPagedByStatus(p.status ?? 'pending', p.page, p.limit) },
);
const attendanceController = createAttendanceController(
  recordAttendanceUsecase,
  editAttendanceUsecase,
  getAttendanceHistoryUsecase,
  getSessionAttendanceStatusUsecase,
  getSessionAttendanceHistoryUsecase,
);
const makeupSessionController = createMakeupSessionController(
  createMakeupSessionUsecase,
  completeMakeupSessionUsecase,
  listMakeupSessionsUsecase,
  previewMakeupConflictUsecase,
);
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
  listUnfinalizedPayrollUsecase,
  updatePayrollNotesUsecase,
);

// ─── Import/Export repos + services ───────────────────────────────────────────
const studentsImporter = new StudentsImporter(db);
const usersImporter = new UsersImporter();
const enrollmentsImporter = new EnrollmentsImporter(db);
const holidaysImporter = new HolidaysImporter(db);
const receiptsImporter = new ReceiptsImporter(db);
const attendanceImporter = new AttendanceImporter(async (classCode, sessionNo, studentCode) => {
  const cc = classCode.trim();
  const sn = Number(sessionNo);
  const code = studentCode.trim();

  const classRes = await db.query(`SELECT id FROM classes WHERE class_code = $1 LIMIT 1`, [cc]);
  if (!classRes.rows[0]) {
    return { isValid: false, reason: 'Không tìm thấy lớp' };
  }
  const classId = classRes.rows[0].id as string;

  const sessRes = await db.query(`SELECT id FROM sessions WHERE class_id = $1 AND session_no = $2 LIMIT 1`, [
    classId,
    sn,
  ]);
  if (!sessRes.rows[0]) {
    return { isValid: false, reason: 'Không tìm thấy buổi học' };
  }
  const sessionId = sessRes.rows[0].id as string;

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
    sessionId,
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
const authenticate = authMiddleware(jwtProvider, userRepo, auditWriter);
const rbac = (...actions: string[]) => authorize(rbacService, ...actions);

/**
 * GET /export/:type — OVERVIEW 3.2 Import/Export: Admin toàn phần; Học vụ/Kế toán theo loại; GV không export toàn trung tâm.
 * Muốn thêm loại export mới: bổ sung nhánh + (nếu cần) assert trong ExportDataUseCase.
 */
const rbacExportByType = (req: Request, res: Response, next: NextFunction) => {
  const t = String(req.params.type ?? '');
  if (t === 'debt' || t === 'debt-report' || t === 'payment-status') {
    return authorize(rbacService, 'debt:read', '*')(req, res, next);
  }
  if (t === 'attendance' || t === 'attendance-sheet') {
    return authorize(rbacService, 'attendance:record', '*')(req, res, next);
  }
  if (t === 'class-roster') {
    return authorize(rbacService, 'class:read', 'debt:read', '*')(req, res, next);
  }
  if (t === 'payroll') {
    return authorize(rbacService, 'payroll:read', 'payroll:read_own', '*')(req, res, next);
  }
  if (t === 'receipts') {
    return authorize(rbacService, 'receipt:create', '*')(req, res, next);
  }
  return authorize(rbacService, '*')(req, res, next);
};

/** POST /import/:type & GET /templates/:type — quyền theo loại (Học vụ: students/attendance/enrollments; Kế toán: receipts; Admin: users/holidays). */
const rbacImportOrTemplateByType = (req: Request, res: Response, next: NextFunction) => {
  const t = String(req.params.type ?? '');
  if (t === 'users' || t === 'holidays') {
    return authorize(rbacService, '*')(req, res, next);
  }
  if (t === 'students') {
    return authorize(rbacService, 'student:create', '*')(req, res, next);
  }
  if (t === 'attendance') {
    return authorize(rbacService, 'attendance:record', '*')(req, res, next);
  }
  if (t === 'enrollments') {
    return authorize(rbacService, 'enrollment:create', '*')(req, res, next);
  }
  if (t === 'receipts') {
    return authorize(rbacService, 'receipt:create', '*')(req, res, next);
  }
  return authorize(rbacService, '*')(req, res, next);
};

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
// Danh sách user: Admin full; Kế toán (chốt lương); Học vụ (dropdown GV khi tạo học bù).
userRouter.get('/', authenticate, rbac('*', 'payroll:read', 'payroll:finalize', 'makeup:create'), userController.listUsers);
userRouter.post('/', authenticate, rbac('*'), validate(CreateUserDtoSchema), userController.createUser);
userRouter.get('/:id', authenticate, userController.getUser);
userRouter.patch('/:id', authenticate, validate(UpdateUserDtoSchema), userController.updateUser);
userRouter.delete('/:id', authenticate, rbac('*'), userController.softDeleteUser);
userRouter.patch('/:id/salary', authenticate, rbac('*'), validate(UpdateSalaryDtoSchema), userController.updateSalary);
userRouter.get('/:id/salary-logs', authenticate, rbac('*'), userController.getSalaryLogs);
userRouter.get('/:id/salary-history', authenticate, rbac('*'), userController.getSalaryLogs);

// Classes
const classRouter = Router();
classRouter.get('/', authenticate, classController.listClasses);
classRouter.post('/', authenticate, rbac('class:create'), validate(CreateClassDto), classController.createClass);
classRouter.get('/suggestions', authenticate, classController.listSuggestions);
classRouter.get('/:id', authenticate, classController.getClass);
classRouter.patch('/:id', authenticate, rbac('class:update'), validate(UpdateClassDto), classController.updateClass);
classRouter.post('/:id/generate-sessions', authenticate, rbac('class:create'), classController.generateSessions);
classRouter.post('/:id/replace-teacher', authenticate, rbac('*'), classController.replaceTeacher);
classRouter.post('/:id/close', authenticate, rbac('class:update'), classController.closeClass);
classRouter.patch('/:id/announce', authenticate, rbac('class:update', '*'), classController.announceClass);
classRouter.get('/:id/roster', authenticate, classController.getRoster);
classRouter.get('/:id/sessions', authenticate, classController.listClassSessions);
classRouter.get(
  '/:id/attendance-matrix',
  authenticate,
  rbac('attendance:record', 'enrollment:read'),
  classController.getAttendanceMatrix,
);

// Sessions (attendance nested here)
const sessionRouter = Router();
sessionRouter.get(
  '/calendar',
  authenticate,
  rbac('class:read', '*'),
  sessionController.listCenterSessions,
);
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
  validate(RecordAttendanceBodySchema),
  attendanceController.recordAttendance,
);
sessionRouter.patch(
  '/:id/attendance',
  authenticate,
  rbac('attendance:record'),
  requireOwnSession(classSessionRepo, sessionCoverRepo),
  attendanceController.editAttendance,
);
sessionRouter.get(
  '/:id/attendance-status',
  authenticate,
  rbac('attendance:record', 'class:read', 'session:read_own'),
  requireOwnSession(classSessionRepo, sessionCoverRepo),
  attendanceController.getAttendanceStatus,
);
sessionRouter.get(
  '/:id/attendance-history',
  authenticate,
  rbac('*'),
  attendanceController.getSessionAttendanceHistory,
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
enrollmentRouter.post('/:id/drop', authenticate, rbac('enrollment:create'), validate(DropEnrollmentBodySchema), enrollmentController.dropEnrollment);
enrollmentRouter.post(
  '/:id/cancel-reservation',
  authenticate,
  rbac('enrollment:create'),
  validate(CancelReservationBodySchema),
  enrollmentController.cancelReservation,
);
enrollmentRouter.post(
  '/:id/reassign-reserved-class',
  authenticate,
  rbac('enrollment:create'),
  validate(ReassignReservedClassBodySchema),
  enrollmentController.reassignReservedClass,
);
enrollmentRouter.post(
  '/:id/transfer-reservation',
  authenticate,
  rbac('enrollment:create'),
  validate(TransferReservationBodySchema),
  enrollmentController.transferReservation,
);
enrollmentRouter.post('/:id/complete', authenticate, rbac('enrollment:create'), enrollmentController.completeEnrollment);
enrollmentRouter.post('/:id/pause', authenticate, rbac('pause_request:create'), validate(PauseEnrollmentBodySchema), enrollmentController.pauseEnrollment);
enrollmentRouter.post(
  '/:id/resume',
  authenticate,
  rbac('enrollment:create'),
  validate(ResumeEnrollmentSchema),
  enrollmentController.resumeEnrollment,
);
enrollmentRouter.post('/:id/transfer-class', authenticate, rbac('enrollment:transfer_class'), validate(TransferClassBodySchema), enrollmentController.transferClass);
enrollmentRouter.post('/:id/upgrade-program', authenticate, rbac('*'), enrollmentController.upgradeProgram);
enrollmentRouter.post(
  '/:id/reset-makeup-blocked',
  authenticate,
  rbac('*'),
  validate(ResetMakeupBlockedBodySchema),
  enrollmentController.resetMakeupBlocked,
);
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
makeupSessionRouter.get(
  '/conflict-preview',
  authenticate,
  rbac('makeup:create'),
  makeupSessionController.previewConflict,
);
makeupSessionRouter.post('/', authenticate, rbac('makeup:create'), validate(CreateMakeupSessionSchema), makeupSessionController.createMakeup);
makeupSessionRouter.patch('/:id/complete', authenticate, rbac('makeup:create'), makeupSessionController.completeMakeup);

// Refund Requests
const refundRequestRouter = Router();
refundRequestRouter.post('/', authenticate, rbac('receipt:create', '*'), validate(CreateRefundRequestSchema), refundRequestController.createRefund);
refundRequestRouter.get('/', authenticate, rbac('receipt:create', '*'), refundRequestController.listRefunds);
refundRequestRouter.patch('/:id/approve', authenticate, rbac('receipt:create', '*'), refundRequestController.approveRefund);
refundRequestRouter.patch('/:id/reject', authenticate, rbac('receipt:create', '*'), refundRequestController.rejectRefund);

// ─── Mount ────────────────────────────────────────────────────────────────────
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/classes', classRouter);
router.get('/schedule/conflict-check', authenticate, classController.listScheduleConflictCheck);
router.get('/upcoming', classController.listUpcomingClasses);
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
// NOTE: static paths must be declared before /:id
payrollRouter.get(
  '/unfinalized-summaries',
  authenticate,
  rbac('payroll:read', 'payroll:finalize', 'payroll:read_own'),
  payrollController.listUnfinalizedPayrolls,
);
payrollRouter.get('/preview', authenticate, rbac('payroll:finalize', 'payroll:read'), payrollController.previewPayroll);
payrollRouter.post('/finalize', authenticate, rbac('payroll:finalize'), validate(PayrollPeriodSchema), payrollController.finalizePayroll);
payrollRouter.get('/', authenticate, rbac('payroll:read', 'payroll:read_own'), payrollController.listPayrolls);
payrollRouter.patch(
  '/:id/notes',
  authenticate,
  rbac('payroll:finalize', '*'),
  validate(PayrollNotesBodySchema),
  payrollController.patchPayrollNotes,
);
payrollRouter.get(
  '/:id',
  authenticate,
  rbac('payroll:read', 'payroll:read_own', '*'),
  requireOwnPayroll(payrollRepo),
  payrollController.getPayroll,
);
router.use('/payroll', payrollRouter);

// ── HR routes: leave + staff payroll ─────────────────────────────────────────
const staffRouter = Router();
staffRouter.post('/leave-requests', authenticate, async (req, res) => {
  try {
    const actor = (req as any).user;
    const { leaveDate, leaveType, reason } = req.body ?? {};
    if (!leaveDate) {
      return res.status(400).json({ code: ERROR_CODES.VALIDATION_ERROR, message: 'leaveDate là bắt buộc' });
    }
    // 2 ngày phép/tháng, không tích lũy. Muốn đổi quota: sửa system_config + view v_leave_balance + trigger fn_staff_leave_adjust.
    const insertRes = await db.query(
      `INSERT INTO staff_leave_requests (
         staff_id, leave_date, leave_type, reason, status, requested_by
       ) VALUES (
         $1, $2::date, COALESCE($3, 'annual_leave'), NULLIF($4, ''), 'pending', $1
       )
       RETURNING *`,
      [actor.id, leaveDate, leaveType, reason],
    );
    const row = insertRes.rows[0];
    const warning = row.leave_type === 'unpaid_leave'
      ? 'Đơn nghỉ vượt quota tháng, đã tự chuyển unpaid_leave'
      : null;
    return res.status(201).json({ data: row, warning });
  } catch (e) {
    return sendErrorResponse(res, e);
  }
});
staffRouter.get('/leave-requests', authenticate, rbac('*', 'payroll:read'), async (req, res) => {
  try {
    const actor = (req as any).user;
    const role = String(actor.role ?? '').toUpperCase();
    const status = (req.query.status as string | undefined) ?? undefined;
    const values: any[] = [];
    const filters: string[] = [];
    if (role !== 'ADMIN' && role !== 'ACCOUNTANT') {
      values.push(actor.id);
      filters.push(`lr.staff_id = $${values.length}`);
    } else if (req.query.staffId) {
      values.push(req.query.staffId);
      filters.push(`lr.staff_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      filters.push(`lr.status = $${values.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT lr.*, u.full_name AS staff_name
       FROM staff_leave_requests lr
       JOIN users u ON u.id = lr.staff_id
       ${where}
       ORDER BY lr.leave_date DESC, lr.created_at DESC`,
      values,
    );
    return res.status(200).json({ data: result.rows });
  } catch (e) {
    return sendErrorResponse(res, e);
  }
});
staffRouter.patch('/leave-requests/:id/approve', authenticate, rbac('*'), async (req, res) => {
  try {
    const actor = (req as any).user;
    const result = await db.query(
      `UPDATE staff_leave_requests
       SET status = 'approved',
           reviewed_by = $2,
           reviewed_at = now(),
           review_note = NULLIF($3, '')
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id, actor.id, req.body?.reviewNote],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ code: ERROR_CODES.NOT_FOUND, message: 'Không tìm thấy đơn chờ duyệt' });
    }
    return res.status(200).json({ data: result.rows[0] });
  } catch (e) {
    return sendErrorResponse(res, e);
  }
});
staffRouter.get('/leave-balance', authenticate, rbac('*', 'payroll:read'), async (req, res) => {
  try {
    const actor = (req as any).user;
    const role = String(actor.role ?? '').toUpperCase();
    const month = Number(req.query.month ?? new Date().getMonth() + 1);
    const year = Number(req.query.year ?? new Date().getFullYear());
    const targetStaffId = (role === 'ADMIN' || role === 'ACCOUNTANT')
      ? (req.query.staffId as string | undefined)
      : actor.id;
    const rows = await db.query(
      `SELECT * FROM v_leave_balance
       WHERE period_month = $1 AND period_year = $2
         AND ($3::uuid IS NULL OR staff_id = $3::uuid)
       ORDER BY staff_name`,
      [month, year, targetStaffId ?? null],
    );
    return res.status(200).json({ data: rows.rows });
  } catch (e) {
    return sendErrorResponse(res, e);
  }
});
// ── Lương nhân viên hành chính (Q18): preview/finalize dùng cùng công thức SQL fn_staff_payroll_preview.
//    gross = monthly_salary - round(unpaid_leave_days × monthly_salary / 26, 0). Quota 2 ngày phép/tháng:
//    trigger `trg_staff_leave_adjust_type` chuyển annual/sick vượt quota → unpaid_leave; fn_staff_payroll_preview (migration 21)
//    trả thêm paid_leave_days_used, remaining_paid_days, total_deduction (Q18).
staffRouter.get('/payroll/preview', authenticate, rbac('*', 'payroll:read'), async (req, res) => {
  try {
    const staffId = String(req.query.staffId ?? '');
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!staffId || !month || !year) {
      return res.status(400).json({ code: ERROR_CODES.VALIDATION_ERROR, message: 'staffId, month, year là bắt buộc' });
    }
    const previewRes = await db.query(
      `SELECT p.*, u.full_name AS staff_name, u.user_code AS staff_code
       FROM fn_staff_payroll_preview($1::uuid, $2::int, $3::int) p
       JOIN users u ON u.id = p.staff_id`,
      [staffId, month, year],
    );
    const row = previewRes.rows[0];
    if (!row) {
      return res.status(404).json({ code: ERROR_CODES.USER_NOT_FOUND, message: 'Không tìm thấy nhân viên' });
    }
    const monthlySalary = Number(row.monthly_salary ?? 0);
    const unpaidDays = Number(row.unpaid_days ?? 0);
    const deduction = Number(row.deduction_amount ?? 0);
    const grossSalary = Number(row.gross_salary ?? 0);
    const totalDeduction = Number(row.total_deduction ?? deduction);
    return res.status(200).json({
      data: {
        staffId,
        staffName: row.staff_name,
        staffCode: row.staff_code,
        month,
        year,
        monthlySalary,
        unpaidDays,
        deduction,
        grossSalary,
        totalDeduction,
        paidLeaveDaysUsed: Number(row.paid_leave_days_used ?? 0),
        monthlyPaidAllowance: Number(row.monthly_paid_allowance ?? 2),
        remainingPaidDays: Number(row.remaining_paid_days ?? 0),
        note: `Lương gross ${grossSalary.toLocaleString('vi-VN')}₫ — Thuế TNCN & BHXH tính theo quy định`,
      },
    });
  } catch (e) {
    return sendErrorResponse(res, e);
  }
});
staffRouter.post('/payroll/finalize', authenticate, rbac('*', 'payroll:finalize'), async (req, res) => {
  try {
    const actor = (req as any).user;
    const { staffId, month, year } = req.body ?? {};
    const previewRes = await db.query(
      `SELECT * FROM fn_staff_payroll_preview($1::uuid, $2::int, $3::int)`,
      [staffId, month, year],
    );
    if (!previewRes.rows[0]) {
      return res.status(400).json({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Không thể preview payroll' });
    }
    const p = previewRes.rows[0];
    const created = await db.query(
      `INSERT INTO staff_payroll_records (
         staff_id, period_month, period_year, monthly_salary_snapshot,
         unpaid_days, deduction_amount, gross_salary, finalized_by, note
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (staff_id, period_month, period_year) DO NOTHING
       RETURNING *`,
      [
        staffId,
        month,
        year,
        p.monthly_salary,
        p.unpaid_days,
        p.deduction_amount,
        p.gross_salary,
        actor.id,
        `Lương gross ${Number(p.gross_salary).toLocaleString('vi-VN')}₫ — Thuế TNCN & BHXH tính theo quy định`,
      ],
    );
    if (!created.rows[0]) {
      return res.status(409).json({ code: ERROR_CODES.PAYROLL_ALREADY_FINALIZED, message: 'Bảng lương nhân viên đã chốt' });
    }
    return res.status(201).json({ data: created.rows[0] });
  } catch (e) {
    return sendErrorResponse(res, e);
  }
});

staffRouter.patch(
  '/payroll-records/:id/notes',
  authenticate,
  rbac('*', 'payroll:finalize'),
  validate(PayrollNotesBodySchema),
  async (req, res) => {
    try {
      const actor = (req as any).user;
      const recordId = String(req.params.id);
      const { notes } = req.body as { notes: string | null };
      const prev = await db.query(`SELECT id, notes FROM staff_payroll_records WHERE id = $1`, [recordId]);
      if (!prev.rows[0]) {
        return res.status(404).json({ code: ERROR_CODES.NOT_FOUND, message: 'Không tìm thấy bản ghi lương nhân viên' });
      }
      await db.query(`UPDATE staff_payroll_records SET notes = $1 WHERE id = $2`, [notes, recordId]);
      const actorIp = Array.isArray(req.ip) ? req.ip[0] : req.ip;
      await auditWriter.write({
        actorId: actor.id,
        actorCode: actor.userCode,
        actorRole: actor.role,
        actorIp,
        action: 'FINANCE:staff_payroll_notes_updated',
        entityType: 'staff_payroll_record',
        entityId: recordId,
        oldValues: { notes: prev.rows[0].notes },
        newValues: { notes },
        description: 'Q29: Cập nhật ghi chú bảng lương nhân viên (không đổi tiền)',
      });
      return res.status(200).json({ success: true, id: recordId, notes });
    } catch (e) {
      return sendErrorResponse(res, e);
    }
  },
);
router.use('/staff', staffRouter);

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
importExportRouter.get('/templates/:type', authenticate, rbacImportOrTemplateByType, importExportController.getTemplate);
importExportRouter.post(
  '/import/:type',
  authenticate,
  rbacImportOrTemplateByType,
  upload.single('file'),
  importExportController.importData,
);
importExportRouter.get('/export/:type', authenticate, rbacExportByType, importExportController.exportData);
importExportRouter.post('/jobs/expire-reserved-enrollments', authenticate, rbac('*'), async (_req, res) => {
  try {
    const result = await expireReservedEnrollmentsUsecase.execute();
    return res.status(200).json({ data: result });
  } catch (e) {
    return sendErrorResponse(res, e);
  }
});
router.use('/', importExportRouter);

// Health: ping DB + số file migration .sql trên đĩa (xem health.controller.ts nếu đổi rule hiển thị)
router.get('/health', createHealthHandler(db));

export default router;

import { ProgramPgRepo } from '../infrastructure/db/repositories/curriculum/program.pg.repo';
import { UnitPgRepo } from '../infrastructure/db/repositories/curriculum/unit.pg.repo';
import { StudentPgRepo } from '../infrastructure/db/repositories/students/student.pg.repo';
import { EnrollmentPgRepo } from '../infrastructure/db/repositories/students/enrollment.pg.repo';
import { EnrollmentHistoryPgRepo } from '../infrastructure/db/repositories/students/enrollment-history.pg.repo';
import { ClassPgRepo } from '../infrastructure/db/repositories/classes/class.pg.repo';
import { ClassStaffPgRepo } from '../infrastructure/db/repositories/classes/class-staff.pg.repo';
import { RosterPgRepo } from '../infrastructure/db/repositories/classes/roster.pg.repo';
import { PostgresSessionRepository } from '../infrastructure/db/repositories/sessions/session.pg.repo';
import { PostgresFeedbackRepository } from '../infrastructure/db/repositories/feedback/feedback.pg.repo';
import { PostgresScoreRepository } from '../infrastructure/db/repositories/feedback/score.pg.repo';
import { PostgresTrialRepository } from '../infrastructure/db/repositories/trials/trial.pg.repo';
import { FeePlanPgRepo } from '../infrastructure/db/repositories/finance/fee-plan.pg.repo';
import { InvoicePgRepo } from '../infrastructure/db/repositories/finance/invoice.pg.repo';
import { PaymentPgRepo } from '../infrastructure/db/repositories/finance/payment.pg.repo';
import { StudentPaymentStatusPgRepo } from '../infrastructure/db/repositories/finance/student-payment-status.pg.repo';
import { AuditPgRepo } from '../infrastructure/db/repositories/system/audit.pg.repo';
import { NotificationPgRepo } from '../infrastructure/db/repositories/system/notification.pg.repo';
import { pool } from '../infrastructure/db/pg-pool';
import { UserPgRepository } from '../infrastructure/db/repositories/auth/user.pg.repo';

import { ListUsersUseCase } from '../application/auth/usecases/list-users.usecase';
import { GetUserUseCase } from '../application/auth/usecases/get-user.usecase';
import { CreateUserUseCase } from '../application/auth/usecases/create-user.usecase';
import { UpdateUserUseCase } from '../application/auth/usecases/update-user.usecase';
import { AssignRoleUseCase } from '../application/auth/usecases/assign-role.usecase';
import { RevokeRoleUseCase } from '../application/auth/usecases/revoke-role.usecase';

import { ListProgramsUseCase } from '../application/curriculum/usecases/list-programs.usecase';
import { GetProgramUseCase } from '../application/curriculum/usecases/get-program.usecase';
import { CreateProgramUseCase } from '../application/curriculum/usecases/create-program.usecase';
import { UpdateProgramUseCase } from '../application/curriculum/usecases/update-program.usecase';

import { ListUnitsUseCase } from '../application/curriculum/usecases/list-units.usecase';
import { GetUnitUseCase } from '../application/curriculum/usecases/get-unit.usecase';
import { CreateUnitUseCase } from '../application/curriculum/usecases/create-unit.usecase';
import { UpdateUnitUseCase } from '../application/curriculum/usecases/update-unit.usecase';
import { ExportCurriculumUseCase } from '../application/curriculum/usecases/export-curriculum.usecase';
import { ImportCurriculumUseCase } from '../application/curriculum/usecases/import-curriculum.usecase';

import { ListStudentsUseCase } from '../application/students/usecases/list-students.usecase';
import { GetStudentUseCase } from '../application/students/usecases/get-student.usecase';
import { CreateStudentUseCase } from '../application/students/usecases/create-student.usecase';
import { UpdateStudentUseCase } from '../application/students/usecases/update-student.usecase';
import { CreateEnrollmentUseCase } from '../application/students/usecases/create-enrollment.usecase';
import { UpdateEnrollmentStatusUseCase } from '../application/students/usecases/update-enrollment-status.usecase';
import { TransferEnrollmentUseCase } from '../application/students/usecases/transfer-enrollment.usecase';
import { EnrollmentEligibilityService } from '../application/students/services/enrollment-eligibility.service';
import { ListStudentEnrollmentsUseCase } from '../application/students/usecases/list-student-enrollments.usecase';
import { ExportStudentsUseCase } from '../application/students/usecases/export-students.usecase';

import { ListClassesUseCase } from '../application/classes/usecases/list-classes.usecase';
import { CreateClassUseCase } from '../application/classes/usecases/create-class.usecase';
import { GetClassUseCase } from '../application/classes/usecases/get-class.usecase';
import { UpdateClassUseCase } from '../application/classes/usecases/update-class.usecase';
import { UpsertSchedulesUseCase } from '../application/classes/usecases/upsert-schedules.usecase';
import { AssignStaffUseCase } from '../application/classes/usecases/assign-staff.usecase';
import { RemoveStaffUseCase } from '../application/classes/usecases/remove-staff.usecase';
import { ChangeMainTeacherUseCase } from '../application/classes/usecases/change-main-teacher.usecase';
import { GetRosterUseCase } from '../application/classes/usecases/get-roster.usecase';
import { AddEnrollmentToClassUseCase } from '../application/classes/usecases/add-enrollment.usecase';
import { CloseClassUseCase } from '../application/classes/usecases/close-class.usecase';
import { PromoteClassUseCase } from '../application/classes/usecases/promote-class.usecase';

import { GenerateSessionsUseCase } from '../application/sessions/usecases/generate-sessions.usecase';
import { ListClassSessionsUseCase } from '../application/sessions/usecases/list-class-sessions.usecase';
import { GetSessionUseCase } from '../application/sessions/usecases/get-session.usecase';
import { UpdateSessionUseCase } from '../application/sessions/usecases/update-session.usecase';
import { ListTeacherSessionsUseCase } from '../application/sessions/usecases/list-teacher-sessions.usecase';

import { ListSessionFeedbackUseCase } from '../application/feedback/usecases/list-session-feedback.usecase';
import { GetEnrollmentAttendanceSummaryUseCase } from '../application/feedback/usecases/get-enrollment-attendance-summary.usecase';
import { ListStudentFeedbackUseCase } from '../application/feedback/usecases/list-student-feedback.usecase';
import { UpsertSessionFeedbackUseCase } from '../application/feedback/usecases/upsert-session-feedback.usecase';
import { ListStudentScoresUseCase } from '../application/feedback/usecases/list-student-scores.usecase';
import { UpsertSessionScoresUseCase } from '../application/feedback/usecases/upsert-session-scores.usecase';
import { ExportFeedbackUseCase } from '../application/feedback/usecases/export-feedback.usecase';
import { ImportSessionFeedbackUseCase } from '../application/feedback/usecases/import-session-feedback.usecase';
import { FeedbackExporter } from '../infrastructure/excel/feedback.exporter';
import { FeedbackImporter } from '../infrastructure/excel/excel.importer';
import { ExportSessionFeedbackTemplateUseCase } from '../application/feedback/usecases/export-session-feedback-template.usecase';

import { ListTrialsUseCase } from '../application/trials/usecases/list-trials.usecase';
import { GetTrialUseCase } from '../application/trials/usecases/get-trial.usecase';
import { CreateTrialUseCase } from '../application/trials/usecases/create-trial.usecase';
import { UpdateTrialUseCase } from '../application/trials/usecases/update-trial.usecase';
import { ScheduleTrialUseCase } from '../application/trials/usecases/schedule-trial.usecase';
import { ConvertTrialUseCase } from '../application/trials/usecases/convert-trial.usecase';
import { ExportTrialsUseCase } from '../application/trials/usecases/export-trials.usecase';

import { ListFeePlansUseCase } from '../application/finance/usecases/list-fee-plans.usecase';
import { CreateFeePlanUseCase } from '../application/finance/usecases/create-fee-plan.usecase';
import { UpdateFeePlanUseCase } from '../application/finance/usecases/update-fee-plan.usecase';
import { DeleteFeePlanUseCase } from '../application/finance/usecases/delete-fee-plan.usecase';
import { ListInvoicesUseCase } from '../application/finance/usecases/list-invoices.usecase';
import { CreateInvoiceUseCase } from '../application/finance/usecases/create-invoice.usecase';
import { GetInvoiceUseCase } from '../application/finance/usecases/get-invoice.usecase';
import { UpdateInvoiceStatusUseCase } from '../application/finance/usecases/update-invoice-status.usecase';
import { CreatePaymentUseCase } from '../application/finance/usecases/create-payment.usecase';
import { GetStudentFinanceUseCase } from '../application/finance/usecases/get-student-finance.usecase';
import { ListStudentPaymentStatusUseCase } from '../application/finance/usecases/list-student-payment-status.usecase';
import { ExportStudentPaymentStatusUseCase } from '../application/finance/usecases/export-student-payment-status.usecase';
import { ExportInvoicesUseCase } from '../application/finance/usecases/export-invoices.usecase';
import { FinanceExporter } from '../infrastructure/excel/finance.exporter';
import { ExportPaymentsUseCase } from '../application/finance/usecases/export-payments.usecase';
import { PaymentsExporter } from '../infrastructure/excel/payments.exporter';
import { TrialsExporter } from '../infrastructure/excel/trials.exporter';
import { StudentsExporter } from '../infrastructure/excel/students.exporter';

import { AuditWriter } from '../application/system/usecases/audit-writer';
import { ListAuditLogsUseCase } from '../application/system/usecases/list-audit-logs.usecase';
import { ListNotificationsUseCase } from '../application/system/usecases/list-notifications.usecase';
import { MarkNotificationReadUseCase } from '../application/system/usecases/mark-notification-read.usecase';
import { MarkAllNotificationsReadUseCase } from '../application/system/usecases/mark-all-notifications-read.usecase';

/**
 * Hàm khởi tạo và kết nối các dependency (Repositories, UseCases).
 * Return về 1 object container chứa toàn bộ các instances cần thiết.
 */
export function buildContainer() {
  // 1. Khởi tạo Repositories
  const programRepo = new ProgramPgRepo();
  const unitRepo = new UnitPgRepo();
  const studentRepo = new StudentPgRepo();
  const enrollmentRepo = new EnrollmentPgRepo();
  const enrollmentHistoryRepo = new EnrollmentHistoryPgRepo();
  const classRepo = new ClassPgRepo();
  const classStaffRepo = new ClassStaffPgRepo();
  const rosterRepo = new RosterPgRepo();
  const sessionRepo = new PostgresSessionRepository(pool);
  const feedbackRepo = new PostgresFeedbackRepository(pool);
  const scoreRepo = new PostgresScoreRepository(pool);
  const trialRepo = new PostgresTrialRepository(pool);
  // Finance repositories
  const feePlanRepo = new FeePlanPgRepo();
  const invoiceRepo = new InvoicePgRepo();
  const paymentRepo = new PaymentPgRepo();
  const studentPaymentStatusRepo = new StudentPaymentStatusPgRepo();
  // System repositories
  const auditRepo        = new AuditPgRepo();
  const notificationRepo = new NotificationPgRepo();
  const userRepo         = new UserPgRepository();

  const feedbackExporter = new FeedbackExporter();
  const feedbackImporter = new FeedbackImporter();
  const financeExporter  = new FinanceExporter();
  const createInvoiceUseCase = new CreateInvoiceUseCase(invoiceRepo, enrollmentRepo, classRepo, programRepo, feePlanRepo);
  const paymentsExporter  = new PaymentsExporter();
  const trialsExporter  = new TrialsExporter();
  const studentsExporter  = new StudentsExporter();

  // Curriculum import/export (JSON contract)
  const exportCurriculumUseCase = new ExportCurriculumUseCase(programRepo, unitRepo);
  const importCurriculumUseCase = new ImportCurriculumUseCase(pool);

  // 2. Helper dùng chung
  // AuditWriter là nguồn chuẩn để ghi audit: làm sạch meta + phát tín hiệu monitoring nếu fail.
  const auditWriter = new AuditWriter(auditRepo);

  // 2. Khởi tạo Use Cases
  return {
    auth: {
      userRepo,
      listUsersUseCase: new ListUsersUseCase(userRepo),
      getUserUseCase: new GetUserUseCase(userRepo),
      createUserUseCase: new CreateUserUseCase(userRepo),
      updateUserUseCase: new UpdateUserUseCase(userRepo),
      assignRoleUseCase: new AssignRoleUseCase(userRepo),
      revokeRoleUseCase: new RevokeRoleUseCase(userRepo),
    },
    curriculum: {
      programRepo,
      unitRepo,
      listProgramsUseCase: new ListProgramsUseCase(programRepo),
      getProgramUseCase: new GetProgramUseCase(programRepo),
      createProgramUseCase: new CreateProgramUseCase(programRepo),
      updateProgramUseCase: new UpdateProgramUseCase(programRepo),
      listUnitsUseCase: new ListUnitsUseCase(unitRepo, programRepo),
      getUnitUseCase: new GetUnitUseCase(unitRepo),
      createUnitUseCase: new CreateUnitUseCase(unitRepo, programRepo),
      updateUnitUseCase: new UpdateUnitUseCase(unitRepo),
      exportCurriculumUseCase,
      importCurriculumUseCase,
    },
    students: {
      studentRepo,
      enrollmentRepo,
      enrollmentHistoryRepo,
      listStudentsUseCase: new ListStudentsUseCase(studentRepo),
      getStudentUseCase: new GetStudentUseCase(studentRepo),
      createStudentUseCase: new CreateStudentUseCase(studentRepo),
      updateStudentUseCase: new UpdateStudentUseCase(studentRepo),
      createEnrollmentUseCase: new CreateEnrollmentUseCase(enrollmentRepo, studentRepo, classRepo, new EnrollmentEligibilityService(enrollmentRepo, invoiceRepo, paymentRepo)),
      updateEnrollmentStatusUseCase: new UpdateEnrollmentStatusUseCase(enrollmentRepo),
      transferEnrollmentUseCase: new TransferEnrollmentUseCase(enrollmentRepo, classRepo, pool, new EnrollmentEligibilityService(enrollmentRepo, invoiceRepo, paymentRepo), invoiceRepo, createInvoiceUseCase),
      listStudentEnrollmentsUseCase: new ListStudentEnrollmentsUseCase(enrollmentRepo, studentRepo, feedbackRepo),
      exportStudentsUseCase: new ExportStudentsUseCase(studentRepo, studentsExporter),
    },
    classes: {
      classRepo,
      classStaffRepo,
      rosterRepo,
      listClassesUseCase: new ListClassesUseCase(classRepo),
      createClassUseCase: new CreateClassUseCase(classRepo),
      getClassUseCase: new GetClassUseCase(classRepo, classStaffRepo),
      updateClassUseCase: new UpdateClassUseCase(classRepo),
      upsertSchedulesUseCase: new UpsertSchedulesUseCase(classRepo),
      assignStaffUseCase: new AssignStaffUseCase(classRepo, classStaffRepo, userRepo),
      removeStaffUseCase: new RemoveStaffUseCase(classRepo, classStaffRepo),
      changeMainTeacherUseCase: new ChangeMainTeacherUseCase(classRepo, classStaffRepo, sessionRepo, userRepo),
      getRosterUseCase: new GetRosterUseCase(classRepo, rosterRepo),
      addEnrollmentToClassUseCase: new AddEnrollmentToClassUseCase(classRepo, rosterRepo, enrollmentRepo, pool, new EnrollmentEligibilityService(enrollmentRepo, invoiceRepo, paymentRepo)),
      closeClassUseCase: new CloseClassUseCase(classRepo, enrollmentRepo, auditWriter, pool),
      promoteClassUseCase: new PromoteClassUseCase(pool, new EnrollmentEligibilityService(enrollmentRepo, invoiceRepo, paymentRepo), createInvoiceUseCase),
    },
    sessions: {
      sessionRepo,
      generateSessionsUseCase: new GenerateSessionsUseCase(sessionRepo, classRepo, classStaffRepo, programRepo, unitRepo),
      listClassSessionsUseCase: new ListClassSessionsUseCase(sessionRepo, classStaffRepo),
      getSessionUseCase: new GetSessionUseCase(sessionRepo),
      updateSessionUseCase: new UpdateSessionUseCase(sessionRepo, userRepo, classRepo, programRepo, unitRepo),
      listTeacherSessionsUseCase: new ListTeacherSessionsUseCase(sessionRepo),
    },
    feedback: {
      feedbackRepo,
      scoreRepo,
      listSessionFeedbackUseCase: new ListSessionFeedbackUseCase(feedbackRepo, rosterRepo, sessionRepo),
      getEnrollmentAttendanceSummaryUseCase: new GetEnrollmentAttendanceSummaryUseCase(feedbackRepo, enrollmentRepo),
      listStudentFeedbackUseCase: new ListStudentFeedbackUseCase(feedbackRepo),
      upsertSessionFeedbackUseCase: new UpsertSessionFeedbackUseCase(feedbackRepo, sessionRepo, rosterRepo, classRepo),
      listStudentScoresUseCase: new ListStudentScoresUseCase(scoreRepo),
      upsertSessionScoresUseCase: new UpsertSessionScoresUseCase(scoreRepo, sessionRepo, rosterRepo, classRepo),
      importSessionFeedbackUseCase: new ImportSessionFeedbackUseCase(
        feedbackRepo,
        scoreRepo,
        sessionRepo as any,
        rosterRepo,
        feedbackImporter,
        pool,
        classRepo,
      ),
      exportFeedbackUseCase: new ExportFeedbackUseCase(
        sessionRepo as any,
        feedbackRepo,
        scoreRepo,
        rosterRepo,
        feedbackExporter,
        classRepo,
      ),
      exportSessionFeedbackTemplateUseCase: new ExportSessionFeedbackTemplateUseCase(
        sessionRepo,
        rosterRepo,
        feedbackRepo,
        feedbackExporter,
        classRepo,
      ),
    },
    trials: {
      trialRepo,
      listTrialsUseCase: new ListTrialsUseCase(trialRepo),
      getTrialUseCase: new GetTrialUseCase(trialRepo),
      createTrialUseCase: new CreateTrialUseCase(trialRepo),
      updateTrialUseCase: new UpdateTrialUseCase(trialRepo),
      scheduleTrialUseCase: new ScheduleTrialUseCase(trialRepo),
      convertTrialUseCase: new ConvertTrialUseCase(),
      exportTrialsUseCase: new ExportTrialsUseCase(trialRepo, trialsExporter),
    },
    finance: {
      feePlanRepo,
      invoiceRepo,
      paymentRepo,
      listFeePlansUseCase:        new ListFeePlansUseCase(feePlanRepo),
      createFeePlanUseCase:       new CreateFeePlanUseCase(feePlanRepo),
      updateFeePlanUseCase:       new UpdateFeePlanUseCase(feePlanRepo),
      deleteFeePlanUseCase:       new DeleteFeePlanUseCase(feePlanRepo),
      listInvoicesUseCase:        new ListInvoicesUseCase(invoiceRepo, paymentRepo),
      createInvoiceUseCase,
      getInvoiceUseCase:          new GetInvoiceUseCase(invoiceRepo, paymentRepo),
      updateInvoiceStatusUseCase: new UpdateInvoiceStatusUseCase(invoiceRepo, paymentRepo),
      createPaymentUseCase:       new CreatePaymentUseCase(invoiceRepo, paymentRepo),
      getStudentFinanceUseCase:   new GetStudentFinanceUseCase(enrollmentRepo, invoiceRepo, paymentRepo),
      listStudentPaymentStatusUseCase: new ListStudentPaymentStatusUseCase(studentPaymentStatusRepo),
      exportStudentPaymentStatusUseCase: new ExportStudentPaymentStatusUseCase(studentPaymentStatusRepo, financeExporter),
      exportInvoicesUseCase:      new ExportInvoicesUseCase(invoiceRepo as any, financeExporter),
      exportPaymentsUseCase:      new ExportPaymentsUseCase(paymentRepo, paymentsExporter),
    },
    system: {
      auditRepo,
      notificationRepo,
      // AuditWriter: helper dùng chung cho các module khác để ghi audit log
      // Ví dụ: container.system.auditWriter.write(userId, "STUDENT_CREATE", "student", id, { name })
      auditWriter,
      listAuditLogsUsecase:           new ListAuditLogsUseCase(auditRepo),
      listNotificationsUsecase:       new ListNotificationsUseCase(notificationRepo),
      markNotificationReadUsecase:    new MarkNotificationReadUseCase(notificationRepo),
      markAllNotificationsReadUsecase: new MarkAllNotificationsReadUseCase(notificationRepo),
    },
  };
}


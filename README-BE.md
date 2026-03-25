
```
eim-center-backend
├─ database
│  ├─ migrations
│  │  ├─ 00_extensions.sql
│  │  ├─ 01_auth.sql
│  │  ├─ 02_curriculum.sql
│  │  ├─ 03_students_enrollment.sql
│  │  ├─ 04_classes.sql
│  │  ├─ 05_sessions.sql
│  │  ├─ 06_feedback.sql
│  │  ├─ 07_feedback_columns.sql
│  │  ├─ 08_trial.sql
│  │  ├─ 09_finance.sql
│  │  ├─ 10_system.sql
│  │  ├─ 11_enrollment_blueprint_fix.sql
│  │  ├─ 12_class_staff_semantics_fix.sql
│  │  ├─ 13_split_sales_finance_role.sql
│  │  ├─ 14_add_sessions_lesson_pattern.sql
│  │  ├─ 15_class_staff_main_unique.sql
│  │  ├─ 16_enrollment_capacity_guard.sql
│  │  ├─ 17_journey_integrity_guards.sql
│  │  ├─ 18_finance_feeplan_invoice_snapshot.sql
│  │  ├─ 19_feedback_export_jobs.sql
│  │  ├─ 20_director_read_only_policy.sql
│  │  ├─ 21_sessions_staff_integrity.sql
│  │  ├─ 22_trial_converted_integrity_guard.sql
│  │  ├─ 23_director_student_read_only_policy.sql
│  │  ├─ 24_session_status_and_reschedule_changed_by.sql
│  │  ├─ 25_enrollment_one_active_per_student.sql
│  │  └─ 26_fks_constraints.sql
│  ├─ scripts
│  │  ├─ 00_full_reset.sql
│  │  ├─ 01_create_db.sql
│  │  ├─ 02_reset_schema.sql
│  │  ├─ 03_run_migrations.sql
│  │  ├─ 04_run_seeds.sql
│  │  └─ 05_smoke_queries.sql
│  └─ seeds
│     ├─ 01_seed_auth.sql
│     ├─ 02_seed_curriculum.sql
│     ├─ 03_seed_classes_students.sql
│     ├─ 04_seed_feedback_trials.sql
│     ├─ 05_seed_finance.sql
│     └─ 06_seed_system.sql
├─ eslint.config.mjs
├─ nodemon.json
├─ package-lock.json
├─ package.json
├─ README-BE.md
├─ src
│  ├─ application
│  │  ├─ auth
│  │  │  ├─ dtos
│  │  │  │  ├─ login.dto.ts
│  │  │  │  ├─ refresh.dto.ts
│  │  │  │  └─ user-management.dto.ts
│  │  │  ├─ mappers
│  │  │  │  └─ auth.mapper.ts
│  │  │  └─ usecases
│  │  │     ├─ assign-role.usecase.ts
│  │  │     ├─ create-user.usecase.ts
│  │  │     ├─ get-user.usecase.ts
│  │  │     ├─ list-users.usecase.ts
│  │  │     ├─ login.usecase.ts
│  │  │     ├─ logout.usecase.ts
│  │  │     ├─ me.usecase.ts
│  │  │     ├─ refresh.usecase.ts
│  │  │     ├─ revoke-role.usecase.ts
│  │  │     └─ update-user.usecase.ts
│  │  ├─ classes
│  │  │  ├─ dtos
│  │  │  │  ├─ class.dto.ts
│  │  │  │  ├─ promotion.dto.ts
│  │  │  │  ├─ schedule.dto.ts
│  │  │  │  └─ staff.dto.ts
│  │  │  ├─ mappers
│  │  │  │  └─ classes.mapper.ts
│  │  │  └─ usecases
│  │  │     ├─ add-enrollment.usecase.ts
│  │  │     ├─ assign-staff.usecase.ts
│  │  │     ├─ close-class.usecase.ts
│  │  │     ├─ create-class.usecase.ts
│  │  │     ├─ get-class.usecase.ts
│  │  │     ├─ get-roster.usecase.ts
│  │  │     ├─ list-classes.usecase.ts
│  │  │     ├─ promote-class.usecase.ts
│  │  │     ├─ remove-staff.usecase.ts
│  │  │     ├─ update-class.usecase.ts
│  │  │     └─ upsert-schedules.usecase.ts
│  │  ├─ curriculum
│  │  │  ├─ dtos
│  │  │  │  ├─ curriculum-import-export.dto.ts
│  │  │  │  ├─ program.dto.ts
│  │  │  │  └─ unit.dto.ts
│  │  │  ├─ mappers
│  │  │  │  └─ curriculum.mapper.ts
│  │  │  └─ usecases
│  │  │     ├─ create-program.usecase.ts
│  │  │     ├─ create-unit.usecase.ts
│  │  │     ├─ export-curriculum.usecase.ts
│  │  │     ├─ get-program.usecase.ts
│  │  │     ├─ get-unit.usecase.ts
│  │  │     ├─ import-curriculum.usecase.ts
│  │  │     ├─ list-programs.usecase.ts
│  │  │     ├─ list-units.usecase.ts
│  │  │     ├─ update-program.usecase.ts
│  │  │     └─ update-unit.usecase.ts
│  │  ├─ feedback
│  │  │  ├─ audit
│  │  │  │  └─ feedback-audit.helper.ts
│  │  │  ├─ constants
│  │  │  │  └─ feedback-audit.constants.ts
│  │  │  ├─ dtos
│  │  │  │  ├─ feedback.dto.ts
│  │  │  │  ├─ list.dto.ts
│  │  │  │  └─ score.dto.ts
│  │  │  ├─ mappers
│  │  │  │  └─ feedback.mapper.ts
│  │  │  └─ usecases
│  │  │     ├─ export-feedback.usecase.ts
│  │  │     ├─ export-session-feedback-template.usecase.ts
│  │  │     ├─ import-session-feedback.usecase.ts
│  │  │     ├─ list-session-feedback.usecase.ts
│  │  │     ├─ list-student-feedback.usecase.ts
│  │  │     ├─ list-student-scores.usecase.ts
│  │  │     ├─ upsert-session-feedback.usecase.ts
│  │  │     └─ upsert-session-scores.usecase.ts
│  │  ├─ finance
│  │  │  ├─ dtos
│  │  │  │  ├─ fee-plan.dto.ts
│  │  │  │  ├─ invoice.dto.ts
│  │  │  │  ├─ payment.dto.ts
│  │  │  │  ├─ student-finance.dto.ts
│  │  │  │  └─ student-payment-status.dto.ts
│  │  │  ├─ mappers
│  │  │  │  └─ finance.mapper.ts
│  │  │  └─ usecases
│  │  │     ├─ create-fee-plan.usecase.ts
│  │  │     ├─ create-invoice.usecase.ts
│  │  │     ├─ create-payment.usecase.ts
│  │  │     ├─ delete-fee-plan.usecase.ts
│  │  │     ├─ export-invoices.usecase.ts
│  │  │     ├─ export-payments.usecase.ts
│  │  │     ├─ export-student-payment-status.usecase.ts
│  │  │     ├─ get-invoice.usecase.ts
│  │  │     ├─ get-student-finance.usecase.ts
│  │  │     ├─ list-fee-plans.usecase.ts
│  │  │     ├─ list-invoices.usecase.ts
│  │  │     ├─ list-student-payment-status.usecase.ts
│  │  │     ├─ update-fee-plan.usecase.ts
│  │  │     └─ update-invoice-status.usecase.ts
│  │  ├─ sessions
│  │  │  ├─ dtos
│  │  │  │  ├─ generate-sessions.dto.ts
│  │  │  │  ├─ list-sessions.dto.ts
│  │  │  │  └─ update-session.dto.ts
│  │  │  ├─ mappers
│  │  │  │  └─ sessions.mapper.ts
│  │  │  └─ usecases
│  │  │     ├─ generate-sessions.usecase.ts
│  │  │     ├─ get-session.usecase.ts
│  │  │     ├─ list-class-sessions.usecase.ts
│  │  │     ├─ list-teacher-sessions.usecase.ts
│  │  │     └─ update-session.usecase.ts
│  │  ├─ students
│  │  │  ├─ dtos
│  │  │  │  ├─ enrollment.dto.ts
│  │  │  │  └─ student.dto.ts
│  │  │  ├─ mappers
│  │  │  │  └─ students.mapper.ts
│  │  │  └─ usecases
│  │  │     ├─ create-enrollment.usecase.ts
│  │  │     ├─ create-student.usecase.ts
│  │  │     ├─ export-students.usecase.ts
│  │  │     ├─ get-student.usecase.ts
│  │  │     ├─ list-student-enrollments.usecase.ts
│  │  │     ├─ list-students.usecase.ts
│  │  │     ├─ transfer-enrollment.usecase.ts
│  │  │     ├─ update-enrollment-status.usecase.ts
│  │  │     └─ update-student.usecase.ts
│  │  ├─ system
│  │  │  ├─ dtos
│  │  │  │  ├─ audit.dto.ts
│  │  │  │  └─ notification.dto.ts
│  │  │  ├─ mappers
│  │  │  │  └─ system.mapper.ts
│  │  │  ├─ services
│  │  │  │  └─ audit-failure.monitor.ts
│  │  │  └─ usecases
│  │  │     ├─ audit-writer.ts
│  │  │     ├─ create-audit-log.usecase.ts
│  │  │     ├─ list-audit-logs.usecase.ts
│  │  │     ├─ list-notifications.usecase.ts
│  │  │     ├─ mark-all-notifications-read.usecase.ts
│  │  │     └─ mark-notification-read.usecase.ts
│  │  └─ trials
│  │     ├─ dtos
│  │     │  ├─ convert.dto.ts
│  │     │  ├─ schedule.dto.ts
│  │     │  └─ trial.dto.ts
│  │     ├─ mappers
│  │     │  └─ trials.mapper.ts
│  │     └─ usecases
│  │        ├─ convert-trial.usecase.ts
│  │        ├─ create-trial.usecase.ts
│  │        ├─ export-trials.usecase.ts
│  │        ├─ get-trial.usecase.ts
│  │        ├─ list-trials.usecase.ts
│  │        ├─ schedule-trial.usecase.ts
│  │        └─ update-trial.usecase.ts
│  ├─ bootstrap
│  │  ├─ container.ts
│  │  └─ seed-runtime.ts
│  ├─ config
│  │  ├─ constants.ts
│  │  ├─ env.ts
│  │  └─ swagger.ts
│  ├─ domain
│  │  ├─ auth
│  │  │  ├─ entities
│  │  │  │  ├─ permission.entity.ts
│  │  │  │  ├─ role.entity.ts
│  │  │  │  └─ user.entity.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ permission.repo.port.ts
│  │  │  │  ├─ role.repo.port.ts
│  │  │  │  └─ user.repo.port.ts
│  │  │  ├─ services
│  │  │  │  └─ rbac.service.ts
│  │  │  └─ value-objects
│  │  │     ├─ email.vo.ts
│  │  │     └─ user-status.vo.ts
│  │  ├─ classes
│  │  │  ├─ entities
│  │  │  │  ├─ class-staff.entity.ts
│  │  │  │  └─ class.entity.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ class-staff.repo.port.ts
│  │  │  │  ├─ class.repo.port.ts
│  │  │  │  └─ roster.repo.port.ts
│  │  │  └─ services
│  │  │     └─ class-capacity.rule.ts
│  │  ├─ curriculum
│  │  │  ├─ entities
│  │  │  │  ├─ program.entity.ts
│  │  │  │  └─ unit.entity.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ program.repo.port.ts
│  │  │  │  └─ unit.repo.port.ts
│  │  │  └─ services
│  │  │     ├─ assessment-session.rule.ts
│  │  │     └─ session-type.rule.ts
│  │  ├─ feedback
│  │  │  ├─ entities
│  │  │  │  ├─ session-feedback.entity.ts
│  │  │  │  └─ session-score.entity.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ feedback.repo.port.ts
│  │  │  │  └─ score.repo.port.ts
│  │  │  └─ services
│  │  │     ├─ feedback.policy.ts
│  │  │     ├─ feedback.validator.ts
│  │  │     ├─ score.policy.ts
│  │  │     └─ teacher-ownership.rule.ts
│  │  ├─ finance
│  │  │  ├─ entities
│  │  │  │  ├─ fee-plan.entity.ts
│  │  │  │  ├─ invoice.entity.ts
│  │  │  │  └─ payment.entity.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ fee-plan.repo.port.ts
│  │  │  │  ├─ invoice.repo.port.ts
│  │  │  │  ├─ payment.repo.port.ts
│  │  │  │  └─ student-payment-status.repo.port.ts
│  │  │  ├─ services
│  │  │  │  ├─ invoice-overdue.rule.ts
│  │  │  │  └─ invoice-status.rule.ts
│  │  │  └─ value-objects
│  │  │     ├─ invoice-status.vo.ts
│  │  │     └─ money.vo.ts
│  │  ├─ sessions
│  │  │  ├─ entities
│  │  │  │  └─ session.entity.ts
│  │  │  ├─ repositories
│  │  │  │  └─ session.repo.port.ts
│  │  │  └─ services
│  │  │     ├─ cover-teacher.rule.ts
│  │  │     └─ session-generator.service.ts
│  │  ├─ students
│  │  │  ├─ entities
│  │  │  │  ├─ enrollment.entity.ts
│  │  │  │  └─ student.entity.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ enrollment-history.repo.port.ts
│  │  │  │  ├─ enrollment.repo.port.ts
│  │  │  │  └─ student.repo.port.ts
│  │  │  ├─ services
│  │  │  │  └─ enrollment-transition.rule.ts
│  │  │  └─ value-objects
│  │  │     └─ enrollment-status.vo.ts
│  │  ├─ system
│  │  │  ├─ entities
│  │  │  │  ├─ audit-log.entity.ts
│  │  │  │  └─ notification.entity.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ audit.repo.port.ts
│  │  │  │  └─ notification.repo.port.ts
│  │  │  └─ services
│  │  │     ├─ audit.rule.ts
│  │  │     └─ notification.rule.ts
│  │  └─ trials
│  │     ├─ entities
│  │     │  └─ trial-lead.entity.ts
│  │     ├─ repositories
│  │     │  └─ trial.repo.port.ts
│  │     └─ services
│  │        └─ convert-trial.rule.ts
│  ├─ infrastructure
│  │  ├─ auth
│  │  │  ├─ jwt.provider.ts
│  │  │  └─ password-hasher.ts
│  │  ├─ clock
│  │  │  └─ system-clock.ts
│  │  ├─ db
│  │  │  ├─ migrations
│  │  │  ├─ pg-pool.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ auth
│  │  │  │  │  └─ user.pg.repo.ts
│  │  │  │  ├─ classes
│  │  │  │  │  ├─ class-staff.pg.repo.ts
│  │  │  │  │  ├─ class.pg.repo.ts
│  │  │  │  │  └─ roster.pg.repo.ts
│  │  │  │  ├─ curriculum
│  │  │  │  │  ├─ program.pg.repo.ts
│  │  │  │  │  └─ unit.pg.repo.ts
│  │  │  │  ├─ feedback
│  │  │  │  │  ├─ feedback.pg.repo.ts
│  │  │  │  │  └─ score.pg.repo.ts
│  │  │  │  ├─ finance
│  │  │  │  │  ├─ fee-plan.pg.repo.ts
│  │  │  │  │  ├─ invoice.pg.repo.ts
│  │  │  │  │  ├─ payment.pg.repo.ts
│  │  │  │  │  └─ student-payment-status.pg.repo.ts
│  │  │  │  ├─ sessions
│  │  │  │  │  └─ session.pg.repo.ts
│  │  │  │  ├─ students
│  │  │  │  │  ├─ enrollment-history.pg.repo.ts
│  │  │  │  │  ├─ enrollment.pg.repo.ts
│  │  │  │  │  └─ student.pg.repo.ts
│  │  │  │  ├─ system
│  │  │  │  │  ├─ audit.pg.repo.ts
│  │  │  │  │  └─ notification.pg.repo.ts
│  │  │  │  └─ trials
│  │  │  │     └─ trial.pg.repo.ts
│  │  │  └─ tx.ts
│  │  ├─ excel
│  │  │  ├─ excel.importer.ts
│  │  │  ├─ feedback-excel.contract.ts
│  │  │  ├─ feedback.exporter.ts
│  │  │  ├─ finance.exporter.ts
│  │  │  ├─ payments.exporter.ts
│  │  │  ├─ students.exporter.ts
│  │  │  └─ trials.exporter.ts
│  │  └─ logger
│  │     ├─ pino.ts
│  │     └─ request-logger.middleware.ts
│  ├─ main.ts
│  ├─ presentation
│  │  ├─ http
│  │  │  ├─ app.ts
│  │  │  ├─ controllers
│  │  │  │  ├─ auth
│  │  │  │  │  ├─ auth.controller.ts
│  │  │  │  │  ├─ user-management.controller.ts
│  │  │  │  │  └─ user-management.routes.ts
│  │  │  │  ├─ classes
│  │  │  │  │  └─ classes.controller.ts
│  │  │  │  ├─ curriculum
│  │  │  │  │  └─ curriculum.controller.ts
│  │  │  │  ├─ feedback
│  │  │  │  │  ├─ feedback-export-jobs.store.ts
│  │  │  │  │  ├─ feedback.controller.ts
│  │  │  │  │  └─ feedback.routes.ts
│  │  │  │  ├─ finance
│  │  │  │  │  ├─ finance.controller.ts
│  │  │  │  │  └─ finance.routes.ts
│  │  │  │  ├─ sessions
│  │  │  │  │  ├─ sessions.controller.ts
│  │  │  │  │  └─ sessions.routes.ts
│  │  │  │  ├─ students
│  │  │  │  │  ├─ enrollments.controller.ts
│  │  │  │  │  └─ students.controller.ts
│  │  │  │  ├─ system
│  │  │  │  │  ├─ system.controller.ts
│  │  │  │  │  └─ system.routes.ts
│  │  │  │  └─ trials
│  │  │  │     └─ trials.controller.ts
│  │  │  ├─ middlewares
│  │  │  │  ├─ auth.middleware.ts
│  │  │  │  ├─ error-handler.middleware.ts
│  │  │  │  ├─ rate-limit.middleware.ts
│  │  │  │  ├─ rbac.middleware.ts
│  │  │  │  ├─ teacher-idor.middleware.ts
│  │  │  │  └─ validate.middleware.ts
│  │  │  ├─ routes
│  │  │  │  └─ auth.routes.ts
│  │  │  └─ routes.ts
│  │  └─ swagger
│  │     ├─ openapi.builder.ts
│  │     ├─ openapi.paths.ts
│  │     └─ openapi.schemas.ts
│  ├─ server.ts
│  └─ shared
│     ├─ errors
│     │  ├─ app-error.ts
│     │  ├─ error-codes.ts
│     │  └─ http-error.mapper.ts
│     ├─ result
│     │  ├─ paged-result.ts
│     │  └─ result.ts
│     ├─ security
│     │  ├─ password.policy.ts
│     │  └─ rbac.policy.ts
│     ├─ types
│     │  ├─ common.types.ts
│     │  └─ express.types.ts
│     └─ utils
│        ├─ date.util.ts
│        ├─ pagination.util.ts
│        └─ string.util.ts
├─ tsconfig.build.json
└─ tsconfig.json

```
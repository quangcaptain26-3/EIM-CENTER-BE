
```
eim-center-backend
├─ database
│  ├─ CSDL_mo_ta_bang.txt
│  ├─ migrations
│  │  ├─ 01_extensions.sql
│  │  ├─ 02_auth.sql
│  │  ├─ 03_facility.sql
│  │  ├─ 04_programs_classes.sql
│  │  ├─ 05_sessions.sql
│  │  ├─ 06_students.sql
│  │  ├─ 07_attendance.sql
│  │  ├─ 08_finance.sql
│  │  ├─ 09_payroll.sql
│  │  ├─ 10_audit_search.sql
│  │  ├─ 11_triggers_constraints.sql
│  │  ├─ 12_students_deleted_at.sql
│  │  ├─ 13_auth_guards.sql
│  │  ├─ 14_classes_announced_at.sql
│  │  ├─ 15_enrollment_lifecycle.sql
│  │  ├─ 16_finance_refund_reason_update.sql
│  │  ├─ 17_hr_staff_leave_payroll.sql
│  │  ├─ 18_enrollment_pause_constraint.sql
│  │  └─ 19_session_covers_unique.sql
│  ├─ scripts
│  │  ├─ 00_full_reset.sql
│  │  ├─ 01_create_db.sql
│  │  ├─ 01_run_migrations.sql
│  │  ├─ 02_reset_schema.sql
│  │  ├─ 02_run_seeds.sql
│  │  ├─ 03_run_migrations.sql
│  │  ├─ 03_smoke_test.sql
│  │  ├─ 04_run_seeds.sql
│  │  ├─ 05_smoke_queries.sql
│  │  ├─ fix_director_sales_password.sql
│  │  └─ INSTALL.sql
│  └─ seeds
│     ├─ 01_roles.sql
│     ├─ 02_users.sql
│     ├─ 03_facility.sql
│     ├─ 04_programs.sql
│     ├─ 05_classes.sql
│     ├─ 06_students.sql
│     ├─ 07_enrollments.sql
│     ├─ 08_sessions_attendance.sql
│     └─ 09_finance.sql
├─ nodemon.json
├─ package-lock.json
├─ package.json
├─ README-BE.md
├─ README.md
├─ src
│  ├─ application
│  │  ├─ auth
│  │  │  ├─ dtos
│  │  │  │  ├─ auth.dto.ts
│  │  │  │  └─ user.dto.ts
│  │  │  ├─ mappers
│  │  │  │  └─ auth.mapper.ts
│  │  │  └─ usecases
│  │  │     ├─ create-user.usecase.ts
│  │  │     ├─ get-user.usecase.ts
│  │  │     ├─ list-users.usecase.ts
│  │  │     ├─ login.usecase.ts
│  │  │     ├─ logout.usecase.ts
│  │  │     ├─ me.usecase.ts
│  │  │     ├─ refresh.usecase.ts
│  │  │     ├─ soft-delete-user.usecase.ts
│  │  │     ├─ update-salary.usecase.ts
│  │  │     └─ update-user.usecase.ts
│  │  ├─ classes
│  │  │  ├─ dtos
│  │  │  │  └─ class.dto.ts
│  │  │  ├─ guards
│  │  │  │  └─ ensure-class-access-by-role.ts
│  │  │  └─ usecases
│  │  │     ├─ announce-class.usecase.ts
│  │  │     ├─ close-class.usecase.ts
│  │  │     ├─ create-class.usecase.ts
│  │  │     ├─ get-class-attendance-matrix.usecase.ts
│  │  │     ├─ get-class.usecase.ts
│  │  │     ├─ get-roster.usecase.ts
│  │  │     ├─ list-classes.usecase.ts
│  │  │     ├─ list-programs.usecase.ts
│  │  │     ├─ list-rooms.usecase.ts
│  │  │     ├─ list-upcoming-classes.usecase.ts
│  │  │     ├─ replace-teacher.usecase.ts
│  │  │     └─ update-class.usecase.ts
│  │  ├─ dashboard
│  │  │  └─ usecases
│  │  │     └─ dashboard-stats.usecase.ts
│  │  ├─ finance
│  │  │  ├─ dtos
│  │  │  │  └─ finance.dto.ts
│  │  │  └─ usecases
│  │  │     ├─ create-receipt.usecase.ts
│  │  │     ├─ finalize-payroll.usecase.ts
│  │  │     ├─ finance-dashboard.usecase.ts
│  │  │     ├─ get-debt.usecase.ts
│  │  │     ├─ get-payroll.usecase.ts
│  │  │     ├─ list-payment-status.usecase.ts
│  │  │     ├─ list-payrolls.usecase.ts
│  │  │     ├─ list-receipts.usecase.ts
│  │  │     ├─ list-unfinalized-payroll.usecase.ts
│  │  │     ├─ preview-payroll.usecase.ts
│  │  │     └─ void-receipt.usecase.ts
│  │  ├─ sessions
│  │  │  └─ usecases
│  │  │     ├─ assign-cover.usecase.ts
│  │  │     ├─ cancel-cover.usecase.ts
│  │  │     ├─ find-available-covers.usecase.ts
│  │  │     ├─ generate-sessions.usecase.ts
│  │  │     ├─ list-class-sessions.usecase.ts
│  │  │     ├─ list-teacher-sessions.usecase.ts
│  │  │     └─ reschedule-session.usecase.ts
│  │  ├─ students
│  │  │  ├─ dtos
│  │  │  │  ├─ attendance.dto.ts
│  │  │  │  ├─ enrollment.dto.ts
│  │  │  │  ├─ refund.dto.ts
│  │  │  │  └─ student.dto.ts
│  │  │  ├─ helpers
│  │  │  │  └─ log-enrollment-audit.ts
│  │  │  ├─ mappers
│  │  │  │  └─ enrollment.mapper.ts
│  │  │  └─ usecases
│  │  │     ├─ activate-enrollment.usecase.ts
│  │  │     ├─ complete-enrollment.usecase.ts
│  │  │     ├─ complete-makeup.usecase.ts
│  │  │     ├─ create-enrollment.usecase.ts
│  │  │     ├─ create-makeup-session.usecase.ts
│  │  │     ├─ create-refund-request.usecase.ts
│  │  │     ├─ create-student.usecase.ts
│  │  │     ├─ drop-enrollment.usecase.ts
│  │  │     ├─ get-attendance-history.usecase.ts
│  │  │     ├─ get-student.usecase.ts
│  │  │     ├─ list-enrollments.usecase.ts
│  │  │     ├─ list-makeup-sessions.usecase.ts
│  │  │     ├─ list-refund-requests.usecase.ts
│  │  │     ├─ list-students.usecase.ts
│  │  │     ├─ pause-enrollment.usecase.ts
│  │  │     ├─ preview-makeup-conflict.usecase.ts
│  │  │     ├─ record-attendance.usecase.ts
│  │  │     ├─ resume-enrollment.usecase.ts
│  │  │     ├─ review-pause-request.usecase.ts
│  │  │     ├─ review-refund-request.usecase.ts
│  │  │     ├─ start-trial.usecase.ts
│  │  │     ├─ transfer-class.usecase.ts
│  │  │     ├─ transfer-enrollment.usecase.ts
│  │  │     ├─ update-student.usecase.ts
│  │  │     └─ upgrade-program.usecase.ts
│  │  └─ system
│  │     ├─ dtos
│  │     │  ├─ import-export.dto.ts
│  │     │  └─ search.dto.ts
│  │     └─ usecases
│  │        ├─ audit-writer.ts
│  │        ├─ export-data.usecase.ts
│  │        ├─ global-search.usecase.ts
│  │        ├─ import-data.usecase.ts
│  │        ├─ list-audit-logs.usecase.ts
│  │        ├─ search-classes.usecase.ts
│  │        ├─ search-students.usecase.ts
│  │        └─ search-users.usecase.ts
│  ├─ bootstrap
│  │  └─ container.ts
│  ├─ config
│  │  ├─ constants.ts
│  │  ├─ env.ts
│  │  └─ swagger.ts
│  ├─ domain
│  │  ├─ auth
│  │  │  ├─ entities
│  │  │  │  ├─ role.entity.ts
│  │  │  │  └─ user.entity.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ audit-log.repo.port.ts
│  │  │  │  ├─ role.repo.port.ts
│  │  │  │  ├─ salary-log.repo.port.ts
│  │  │  │  ├─ session.repo.port.ts
│  │  │  │  └─ user.repo.port.ts
│  │  │  ├─ services
│  │  │  │  └─ rbac.service.ts
│  │  │  └─ value-objects
│  │  │     └─ email.vo.ts
│  │  ├─ classes
│  │  │  ├─ entities
│  │  │  │  ├─ class.entity.ts
│  │  │  │  ├─ program.entity.ts
│  │  │  │  └─ room.entity.ts
│  │  │  ├─ repositories
│  │  │  │  └─ class.repo.port.ts
│  │  │  └─ services
│  │  │     └─ conflict-checker.service.ts
│  │  ├─ finance
│  │  │  ├─ entities
│  │  │  │  ├─ payroll.entity.ts
│  │  │  │  └─ receipt.entity.ts
│  │  │  └─ repositories
│  │  │     └─ receipt.repo.port.ts
│  │  ├─ sessions
│  │  │  ├─ entities
│  │  │  │  └─ session.entity.ts
│  │  │  ├─ repositories
│  │  │  │  └─ session.repo.port.ts
│  │  │  └─ services
│  │  │     └─ session-generator.service.ts
│  │  ├─ students
│  │  │  ├─ entities
│  │  │  │  ├─ attendance.entity.ts
│  │  │  │  ├─ enrollment.entity.ts
│  │  │  │  ├─ makeup-session.entity.ts
│  │  │  │  ├─ refund-request.entity.ts
│  │  │  │  └─ student.entity.ts
│  │  │  ├─ repositories
│  │  │  │  ├─ attendance.repo.port.ts
│  │  │  │  └─ student.repo.port.ts
│  │  │  └─ services
│  │  │     └─ enrollment-transition.rule.ts
│  │  └─ system
│  │     ├─ entities
│  │     │  └─ audit-log.entity.ts
│  │     └─ repositories
│  │        ├─ audit.repo.port.ts
│  │        └─ search.repo.port.ts
│  ├─ infrastructure
│  │  ├─ auth
│  │  │  ├─ jwt.provider.ts
│  │  │  └─ password-hasher.ts
│  │  ├─ db
│  │  │  ├─ refresh-views.ts
│  │  │  └─ repositories
│  │  │     ├─ auth
│  │  │     │  ├─ audit-log.pg.repo.ts
│  │  │     │  ├─ role.pg.repo.ts
│  │  │     │  ├─ salary-log.pg.repo.ts
│  │  │     │  ├─ session.pg.repo.ts
│  │  │     │  └─ user.pg.repo.ts
│  │  │     ├─ classes
│  │  │     │  ├─ class-staff.pg.repo.ts
│  │  │     │  ├─ class.pg.repo.ts
│  │  │     │  ├─ holiday.pg.repo.ts
│  │  │     │  ├─ program.pg.repo.ts
│  │  │     │  └─ room.pg.repo.ts
│  │  │     ├─ finance
│  │  │     │  ├─ payroll.pg.repo.ts
│  │  │     │  └─ receipt.pg.repo.ts
│  │  │     ├─ sessions
│  │  │     │  ├─ session-cover.pg.repo.ts
│  │  │     │  └─ session.pg.repo.ts
│  │  │     ├─ students
│  │  │     │  ├─ attendance.pg.repo.ts
│  │  │     │  ├─ enrollment-history.pg.repo.ts
│  │  │     │  ├─ enrollment.pg.repo.ts
│  │  │     │  ├─ makeup-session.pg.repo.ts
│  │  │     │  ├─ pause-request.pg.repo.ts
│  │  │     │  ├─ refund-request.pg.repo.ts
│  │  │     │  └─ student.pg.repo.ts
│  │  │     └─ system
│  │  │        ├─ audit.pg.repo.ts
│  │  │        └─ search.pg.repo.ts
│  │  └─ excel
│  │     ├─ base-importer.ts
│  │     ├─ exporters
│  │     │  ├─ attendance-sheet.exporter.ts
│  │     │  ├─ audit-logs-csv.exporter.ts
│  │     │  ├─ class-roster.exporter.ts
│  │     │  ├─ debt-report.exporter.ts
│  │     │  ├─ payroll.exporter.ts
│  │     │  ├─ receipts.exporter.ts
│  │     │  └─ students.exporter.ts
│  │     └─ importers
│  │        ├─ attendance.importer.ts
│  │        ├─ enrollments.importer.ts
│  │        ├─ holidays.importer.ts
│  │        ├─ receipts.importer.ts
│  │        ├─ students.importer.ts
│  │        └─ users.importer.ts
│  ├─ main.ts
│  ├─ presentation
│  │  └─ http
│  │     ├─ controllers
│  │     │  ├─ auth
│  │     │  │  ├─ auth.controller.ts
│  │     │  │  └─ user.controller.ts
│  │     │  ├─ classes
│  │     │  │  ├─ class.controller.ts
│  │     │  │  ├─ program.controller.ts
│  │     │  │  └─ room.controller.ts
│  │     │  ├─ dashboard
│  │     │  │  └─ dashboard.controller.ts
│  │     │  ├─ finance
│  │     │  │  └─ finance.controller.ts
│  │     │  ├─ sessions
│  │     │  │  └─ session.controller.ts
│  │     │  ├─ students
│  │     │  │  ├─ attendance.controller.ts
│  │     │  │  ├─ enrollments.controller.ts
│  │     │  │  ├─ makeup-sessions.controller.ts
│  │     │  │  ├─ pause-requests.controller.ts
│  │     │  │  ├─ refund-requests.controller.ts
│  │     │  │  └─ students.controller.ts
│  │     │  └─ system
│  │     │     ├─ audit.controller.ts
│  │     │     ├─ import-export.controller.ts
│  │     │     └─ search.controller.ts
│  │     ├─ health.controller.ts
│  │     ├─ middlewares
│  │     │  ├─ auth.middleware.ts
│  │     │  ├─ rbac.middleware.ts
│  │     │  ├─ teacher-idor.middleware.ts
│  │     │  └─ validate.middleware.ts
│  │     ├─ routes.ts
│  │     └─ utils
│  │        └─ http-error.util.ts
│  ├─ server.ts
│  └─ shared
│     ├─ errors
│     │  ├─ app-error.ts
│     │  └─ error-codes.ts
│     ├─ logger.ts
│     ├─ result
│     │  └─ result.ts
│     ├─ types
│     │  └─ common.types.ts
│     └─ utils
│        ├─ amount-to-words.ts
│        ├─ date.util.ts
│        ├─ eim-code.ts
│        ├─ pagination.util.ts
│        └─ vn-date.ts
├─ tsconfig.build.json
└─ tsconfig.json

```
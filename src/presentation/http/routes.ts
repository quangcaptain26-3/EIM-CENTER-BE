import { Application } from 'express';

import { authRouter } from './routes/auth.routes';
import { curriculumRouter } from './controllers/curriculum/curriculum.controller';
import { studentsRouter } from './controllers/students/students.controller';
import { enrollmentsRouter } from './controllers/students/enrollments.controller';
import { classesRouter } from './controllers/classes/classes.controller';
import { classSessionsRouter, sessionsRouter } from './controllers/sessions/sessions.routes';
import { trialsRouter } from './controllers/trials/trials.controller';
import {
  sessionsFeedbackRouter,
  studentsFeedbackRouter,
  classesFeedbackRouter
} from './controllers/feedback/feedback.routes';
import {
  financeRouter,
  studentFinanceRouter
} from './controllers/finance/finance.routes';
import { systemRouter } from './controllers/system/system.routes';
import { userManagementRouter } from './controllers/auth/user-management.routes';

export function registerRoutes(app: Application): void {
  app.use('/auth', authRouter);

  app.use('/curriculum', curriculumRouter);

  app.use('/students', studentsRouter);
  app.use('/enrollments', enrollmentsRouter);

  app.use('/classes', classesRouter);
  app.use('/classes', classesFeedbackRouter);
  app.use('/classes/:id/sessions', classSessionsRouter);
  app.use('/sessions', sessionsRouter);

  app.use('/trials', trialsRouter);

  app.use('/sessions/:sessionId', sessionsFeedbackRouter);
  app.use('/students/:id', studentsFeedbackRouter);

  app.use('/finance', financeRouter);
  app.use('/students/:id', studentFinanceRouter);

  app.use('/system/users', userManagementRouter);
  app.use('/system', systemRouter);
}
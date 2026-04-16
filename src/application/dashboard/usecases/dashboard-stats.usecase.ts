/**
 * Dashboard stats — một request gom KPI, biểu đồ, lịch, audit.
 * Phân nhánh theo role: ADMIN/ACADEMIC (đầy đủ), ACCOUNTANT, TEACHER.
 */

export interface RevenueChartPoint {
  month: string;
  cash: number;
  accrual: number;
}

export interface EnrollmentProgramSlice {
  program: string;
  count: number;
  color: string;
}

export interface TodaySessionItem {
  id: string;
  classCode: string;
  teacherName: string;
  roomName: string;
  shift: number;
  shiftLabel: string;
  status: string;
  statusLabel: string;
  highlight: boolean;
}

export interface RecentActivityItem {
  action: string;
  description: string;
  entityCode: string | null;
  actorName: string | null;
  eventTime: string;
}

export interface TopDebtorRow {
  studentName: string;
  classCode: string;
  debt: number;
  parentPhone: string | null;
}

export interface TeacherPayrollPendingRow {
  id: string;
  fullName: string;
  openSessions: number;
}

export interface RevenueByProgramSlice {
  program: string;
  value: number;
}

export interface TeacherWeekDay {
  date: string;
  label: string;
  isToday: boolean;
  sessions: {
    id: string;
    classCode: string;
    shift: number;
    shiftLabel: string;
    roomName: string;
    status: string;
    canAttendance: boolean;
  }[];
}

export interface TeacherDashboardSlice {
  sessionsDoneThisMonth: number;
  sessionsRemainingThisMonth: number;
  estimatedSalaryMonth: number;
  salaryPerSession: number;
  weekDays: TeacherWeekDay[];
}

export interface DashboardStatsResult {
  role: string;

  totalStudents: number;
  activeEnrollments: number;
  trialEnrollments: number;
  pausedEnrollments: number;

  totalClasses: number;
  activeClasses: number;
  totalSessions24h: number;

  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueMomPercent: number | null;

  enrollmentActivationThisMonth: number;
  enrollmentActivationLastMonth: number;
  enrollmentActivationMomPercent: number | null;

  totalDebt: number;
  pendingRefunds: number;
  pendingPauseRequests: number;

  makeupBlockedCount: number;
  studentsWithDebtCount: number;
  pendingCoverSessions: number;

  todaySessions: TodaySessionItem[];
  revenueChart: RevenueChartPoint[];
  enrollmentsByProgram: EnrollmentProgramSlice[];
  recentActivities: RecentActivityItem[];

  /** ACCOUNTANT + ADMIN */
  topDebtors?: TopDebtorRow[];
  teachersPendingPayroll?: TeacherPayrollPendingRow[];
  revenueByProgram?: RevenueByProgramSlice[];
  /** ACCOUNTANT */
  cashThisMonth?: number;
  accrualThisMonth?: number;

  /** TEACHER */
  teacher?: TeacherDashboardSlice;
}

const PROGRAM_COLORS: Record<string, string> = {
  KINDY: '#7c3aed',
  STARTERS: '#2563eb',
  MOVERS: '#0891b2',
  FLYERS: '#d97706',
};

export class DashboardStatsUseCase {
  constructor(private readonly db: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) {}

  async execute(userId: string, role: string): Promise<DashboardStatsResult> {
    const r = role.toUpperCase();
    if (r === 'TEACHER') {
      return this.forTeacher(userId);
    }
    if (r === 'ACCOUNTANT') {
      return this.forAccountant(userId, r);
    }
    return this.forAdminAcademic(r);
  }

  private async forAdminAcademic(role: string): Promise<DashboardStatsResult> {
    const core = await this.fetchCoreMetrics();
    const [chart, byProg, today, activities, extras] = await Promise.all([
      this.revenueChart6m(),
      this.enrollmentsByProgram(),
      this.todaySessions(),
      this.recentActivities(10),
      this.fetchAccountantExtras(),
    ]);

    return {
      role,
      ...core.metrics,
      todaySessions: today,
      revenueChart: chart,
      enrollmentsByProgram: byProg,
      recentActivities: activities,
      topDebtors: extras.topDebtors,
      teachersPendingPayroll: extras.teachersPendingPayroll,
      revenueByProgram: extras.revenueByProgram,
      cashThisMonth: extras.cashThisMonth,
      accrualThisMonth: extras.accrualThisMonth,
    };
  }

  private async forAccountant(_userId: string, role: string): Promise<DashboardStatsResult> {
    const core = await this.fetchCoreMetrics();
    const [chart, byProg, today, activities, extras] = await Promise.all([
      this.revenueChart6m(),
      this.enrollmentsByProgram(),
      this.todaySessions(),
      this.recentActivities(10),
      this.fetchAccountantExtras(),
    ]);

    return {
      role,
      ...core.metrics,
      todaySessions: today,
      revenueChart: chart,
      enrollmentsByProgram: byProg,
      recentActivities: activities,
      topDebtors: extras.topDebtors,
      teachersPendingPayroll: extras.teachersPendingPayroll,
      revenueByProgram: extras.revenueByProgram,
      cashThisMonth: extras.cashThisMonth,
      accrualThisMonth: extras.accrualThisMonth,
    };
  }

  private async forTeacher(userId: string): Promise<DashboardStatsResult> {
    const teacher = await this.fetchTeacherSlice(userId);
    const today = await this.todaySessionsForTeacher(userId);

    const z = (): DashboardStatsResult => ({
      role: 'TEACHER',
      totalStudents: 0,
      activeEnrollments: 0,
      trialEnrollments: 0,
      pausedEnrollments: 0,
      totalClasses: 0,
      activeClasses: 0,
      totalSessions24h: today.length,
      revenueThisMonth: 0,
      revenueLastMonth: 0,
      revenueMomPercent: null,
      enrollmentActivationThisMonth: 0,
      enrollmentActivationLastMonth: 0,
      enrollmentActivationMomPercent: null,
      totalDebt: 0,
      pendingRefunds: 0,
      pendingPauseRequests: 0,
      makeupBlockedCount: 0,
      studentsWithDebtCount: 0,
      pendingCoverSessions: 0,
      todaySessions: today,
      revenueChart: [],
      enrollmentsByProgram: [],
      recentActivities: [],
      teacher,
    });

    return z();
  }

  private async fetchCoreMetrics(): Promise<{
    metrics: Omit<
      DashboardStatsResult,
      | 'role'
      | 'todaySessions'
      | 'revenueChart'
      | 'enrollmentsByProgram'
      | 'recentActivities'
      | 'topDebtors'
      | 'teachersPendingPayroll'
      | 'revenueByProgram'
      | 'cashThisMonth'
      | 'accrualThisMonth'
      | 'teacher'
    >;
  }> {
    const q = `
      WITH
      st AS (SELECT COUNT(*)::int AS c FROM students WHERE is_active = true AND deleted_at IS NULL),
      en AS (
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')::int  AS active_e,
          COUNT(*) FILTER (WHERE status = 'trial')::int   AS trial_e,
          COUNT(*) FILTER (WHERE status = 'paused')::int  AS paused_e
        FROM enrollments
      ),
      cl AS (
        SELECT
          COUNT(*)::int AS total_c,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active_c
        FROM classes
      ),
      ss AS (
        SELECT COUNT(*)::int AS c
        FROM sessions
        WHERE session_date = CURRENT_DATE AND status <> 'cancelled'
      ),
      rev2 AS (
        SELECT
          COALESCE(SUM(CASE
            WHEN payment_date >= date_trunc('month', CURRENT_DATE)::date
             AND payment_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
             AND amount > 0 THEN amount END), 0)::numeric AS this_m,
          COALESCE(SUM(CASE
            WHEN payment_date >= (date_trunc('month', CURRENT_DATE) - interval '1 month')::date
             AND payment_date < date_trunc('month', CURRENT_DATE)::date
             AND amount > 0 THEN amount END), 0)::numeric AS last_m
        FROM receipts
      ),
      act AS (
        SELECT
          COUNT(*) FILTER (
            WHERE action = 'activated'
              AND action_date >= date_trunc('month', CURRENT_DATE)
              AND action_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
          )::int AS this_a,
          COUNT(*) FILTER (
            WHERE action = 'activated'
              AND action_date >= date_trunc('month', CURRENT_DATE) - interval '1 month'
              AND action_date < date_trunc('month', CURRENT_DATE)
          )::int AS last_a
        FROM enrollment_history
      ),
      debt AS (
        SELECT COALESCE(SUM(enrollment_debt(e.id)), 0)::numeric AS total_d
        FROM enrollments e
        WHERE e.status = 'active'
      ),
      ref AS (SELECT COUNT(*)::int AS c FROM refund_requests WHERE status = 'pending'),
      pr AS (SELECT COUNT(*)::int AS c FROM pause_requests WHERE status = 'pending'),
      mk AS (SELECT COUNT(*)::int AS c FROM enrollments WHERE makeup_blocked = true AND status = 'active'),
      cov AS (
        SELECT COUNT(*)::int AS c
        FROM session_covers sc
        JOIN sessions s ON s.id = sc.session_id
        WHERE sc.status = 'pending' AND s.session_date >= CURRENT_DATE
      ),
      sd AS (
        SELECT COUNT(DISTINCT e.student_id)::int AS c
        FROM enrollments e
        WHERE e.status IN ('active', 'paused')
          AND enrollment_debt(e.id) > 0
      )
      SELECT
        st.c AS total_students,
        en.active_e,
        en.trial_e,
        en.paused_e,
        cl.total_c,
        cl.active_c,
        ss.c AS sessions_today,
        rev2.this_m,
        rev2.last_m,
        act.this_a,
        act.last_a,
        debt.total_d,
        ref.c AS pending_refunds,
        pr.c AS pending_pause,
        mk.c AS makeup_blocked,
        cov.c AS pending_cover,
        sd.c AS students_debt
      FROM st, en, cl, ss, rev2, act, debt, ref, pr, mk, cov, sd;
    `;

    const { rows } = await this.db.query(q);
    const row = rows[0] as Record<string, unknown>;

    const thisRev = Number(row.this_m) || 0;
    const lastRev = Number(row.last_m) || 0;
    const thisAct = Number(row.this_a) || 0;
    const lastAct = Number(row.last_a) || 0;

    const revMom =
      lastRev > 0 ? ((thisRev - lastRev) / lastRev) * 100 : thisRev > 0 ? 100 : null;
    const enrollMom =
      lastAct > 0 ? ((thisAct - lastAct) / lastAct) * 100 : thisAct > 0 ? 100 : null;

    return {
      metrics: {
        totalStudents: Number(row.total_students) || 0,
        activeEnrollments: Number(row.active_e) || 0,
        trialEnrollments: Number(row.trial_e) || 0,
        pausedEnrollments: Number(row.paused_e) || 0,
        totalClasses: Number(row.total_c) || 0,
        activeClasses: Number(row.active_c) || 0,
        totalSessions24h: Number(row.sessions_today) || 0,
        revenueThisMonth: thisRev,
        revenueLastMonth: lastRev,
        revenueMomPercent: revMom,
        enrollmentActivationThisMonth: thisAct,
        enrollmentActivationLastMonth: lastAct,
        enrollmentActivationMomPercent: enrollMom,
        totalDebt: Number(row.total_d) || 0,
        pendingRefunds: Number(row.pending_refunds) || 0,
        pendingPauseRequests: Number(row.pending_pause) || 0,
        makeupBlockedCount: Number(row.makeup_blocked) || 0,
        studentsWithDebtCount: Number(row.students_debt) || 0,
        pendingCoverSessions: Number(row.pending_cover) || 0,
      },
    };
  }

  private async revenueChart6m(): Promise<RevenueChartPoint[]> {
    const { rows } = await this.db.query(
      `
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - interval '5 months',
          date_trunc('month', CURRENT_DATE),
          interval '1 month'
        ) AS m
      )
      SELECT
        to_char(m.m, 'YYYY-MM') AS ym,
        ('Th.' || EXTRACT(MONTH FROM m.m)::text) AS label,
        COALESCE((
          SELECT SUM(r.amount)
          FROM receipts r
          WHERE r.amount > 0
            AND r.payment_date >= m.m::date
            AND r.payment_date < (m.m + interval '1 month')::date
        ), 0)::numeric AS cash,
        COALESCE((
          SELECT SUM(e.tuition_fee)
          FROM enrollments e
          WHERE e.enrolled_at >= m.m
            AND e.enrolled_at < m.m + interval '1 month'
        ), 0)::numeric AS accrual
      FROM months m
      ORDER BY ym;
      `,
    );

    return (rows as { label: string; cash: string; accrual: string }[]).map((r) => ({
      month: r.label,
      cash: Number(r.cash) || 0,
      accrual: Number(r.accrual) || 0,
    }));
  }

  private async enrollmentsByProgram(): Promise<EnrollmentProgramSlice[]> {
    const { rows } = await this.db.query(
      `
      SELECT p.code AS code, COUNT(e.id)::int AS cnt
      FROM enrollments e
      JOIN programs p ON p.id = e.program_id
      WHERE e.status = 'active'
      GROUP BY p.code
      ORDER BY cnt DESC;
      `,
    );
    const list = rows as { code: string; cnt: number }[];
    const total = list.reduce((s, x) => s + x.cnt, 0) || 1;
    return list.map((r) => ({
      program: r.code,
      count: r.cnt,
      color: PROGRAM_COLORS[r.code] ?? '#64748b',
    }));
  }

  private sessionStatusLabel(
    status: string,
    sessionDate: string,
    shift: number,
  ): { label: string; highlight: boolean } {
    if (status === 'completed') return { label: 'Xong', highlight: false };
    if (status === 'cancelled') return { label: 'Hủy', highlight: false };
    const d = new Date(sessionDate + 'T12:00:00');
    const now = new Date();
    const today =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (!today) return { label: 'Sắp tới', highlight: false };

    const h = now.getHours();
    const m = now.getMinutes();
    const minutes = h * 60 + m;
    // Ca 1: 8h-12h, Ca 2: 13h-18h (local browser/server — backend dùng giờ server)
    const ca1Start = 8 * 60;
    const ca1End = 12 * 60;
    const ca2Start = 13 * 60;
    const ca2End = 18 * 60;

    if (shift === 1) {
      if (minutes >= ca1Start && minutes < ca1End) return { label: 'Đang dạy', highlight: true };
      if (minutes < ca1Start) return { label: 'Sắp dạy', highlight: false };
      return { label: 'Chưa dạy', highlight: false };
    }
    if (shift === 2) {
      if (minutes >= ca2Start && minutes < ca2End) return { label: 'Đang dạy', highlight: true };
      if (minutes < ca2Start) return { label: 'Sắp dạy', highlight: false };
      return { label: 'Chưa dạy', highlight: false };
    }
    return { label: 'Sắp dạy', highlight: false };
  }

  private async todaySessions(): Promise<TodaySessionItem[]> {
    const { rows } = await this.db.query(
      `
      SELECT
        s.id,
        s.shift,
        s.status,
        s.session_date::text AS session_date,
        c.class_code,
        rm.room_code AS room_name,
        u.full_name AS teacher_name
      FROM sessions s
      JOIN classes c ON c.id = s.class_id
      JOIN rooms rm ON rm.id = c.room_id
      JOIN users u ON u.id = effective_teacher_id(s.id)
      WHERE s.session_date = CURRENT_DATE
        AND s.status <> 'cancelled'
      ORDER BY s.shift, c.class_code;
      `,
    );

    return (rows as {
      id: string;
      shift: number;
      status: string;
      session_date: string;
      class_code: string;
      room_name: string;
      teacher_name: string;
    }[]).map((r) => {
      const st = this.sessionStatusLabel(r.status, r.session_date, r.shift);
      return {
        id: r.id,
        classCode: r.class_code,
        teacherName: r.teacher_name,
        roomName: r.room_name,
        shift: r.shift,
        shiftLabel: r.shift === 1 ? 'Ca 1' : 'Ca 2',
        status: r.status,
        statusLabel: st.label,
        highlight: st.highlight,
      };
    });
  }

  private async todaySessionsForTeacher(userId: string): Promise<TodaySessionItem[]> {
    const { rows } = await this.db.query(
      `
      SELECT
        s.id,
        s.shift,
        s.status,
        s.session_date::text AS session_date,
        c.class_code,
        rm.room_code AS room_name,
        u.full_name AS teacher_name
      FROM sessions s
      JOIN classes c ON c.id = s.class_id
      JOIN rooms rm ON rm.id = c.room_id
      JOIN users u ON u.id = effective_teacher_id(s.id)
      WHERE s.session_date = CURRENT_DATE
        AND s.status <> 'cancelled'
        AND (s.teacher_id = $1 OR EXISTS (
          SELECT 1 FROM session_covers sc
          WHERE sc.session_id = s.id AND sc.cover_teacher_id = $1 AND sc.status IN ('pending','confirmed','completed')
        ))
      ORDER BY s.shift, c.class_code;
      `,
      [userId],
    );

    return (rows as {
      id: string;
      shift: number;
      status: string;
      session_date: string;
      class_code: string;
      room_name: string;
      teacher_name: string;
    }[]).map((r) => {
      const st = this.sessionStatusLabel(r.status, r.session_date, r.shift);
      return {
        id: r.id,
        classCode: r.class_code,
        teacherName: r.teacher_name,
        roomName: r.room_name,
        shift: r.shift,
        shiftLabel: r.shift === 1 ? 'Ca 1' : 'Ca 2',
        status: r.status,
        statusLabel: st.label,
        highlight: st.highlight,
      };
    });
  }

  private async recentActivities(limit: number): Promise<RecentActivityItem[]> {
    const { rows } = await this.db.query(
      `
      SELECT
        a.action,
        COALESCE(a.description, a.action) AS description,
        a.entity_code,
        a.event_time,
        u.full_name AS actor_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_id
      ORDER BY a.event_time DESC
      LIMIT $1;
      `,
      [limit],
    );

    return (
      rows as {
        action: string;
        description: string | null;
        entity_code: string | null;
        actor_name: string | null;
        event_time: Date | string;
      }[]
    ).map((r) => ({
      action: r.action,
      description: r.description ?? r.action,
      entityCode: r.entity_code,
      actorName: r.actor_name,
      eventTime: r.event_time instanceof Date ? r.event_time.toISOString() : String(r.event_time),
    }));
  }

  private async fetchAccountantExtras(): Promise<{
    topDebtors: TopDebtorRow[];
    teachersPendingPayroll: TeacherPayrollPendingRow[];
    revenueByProgram: RevenueByProgramSlice[];
    cashThisMonth: number;
    accrualThisMonth: number;
  }> {
    const monthStart = `date_trunc('month', CURRENT_DATE)::date`;
    const monthEnd = `(date_trunc('month', CURRENT_DATE) + interval '1 month')::date`;

    const [debtors, teachers, byProg, cashAccr] = await Promise.all([
      this.db.query(
        `
        SELECT s.full_name AS student_name, c.class_code,
               enrollment_debt(e.id)::numeric AS debt,
               s.parent_phone
        FROM enrollments e
        JOIN students s ON s.id = e.student_id
        JOIN classes c ON c.id = e.class_id
        WHERE e.status IN ('active','paused')
        ORDER BY enrollment_debt(e.id) DESC
        LIMIT 5;
        `,
      ),
      this.db.query(
        `
        SELECT u.id, u.full_name,
          (
            SELECT COUNT(*)::int FROM sessions s
            WHERE s.teacher_id = u.id AND s.status = 'completed'
              AND s.session_date >= ${monthStart}
              AND s.session_date < ${monthEnd}
          ) AS open_sessions
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE r.code = 'TEACHER' AND u.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM payroll_records pr
            WHERE pr.teacher_id = u.id
              AND pr.period_month = EXTRACT(MONTH FROM CURRENT_DATE)::int
              AND pr.period_year = EXTRACT(YEAR FROM CURRENT_DATE)::int
          )
          AND EXISTS (
            SELECT 1 FROM sessions s
            WHERE s.teacher_id = u.id AND s.status = 'completed'
              AND s.session_date >= ${monthStart}
              AND s.session_date < ${monthEnd}
          )
        ORDER BY u.full_name
        LIMIT 20;
        `,
      ),
      this.db.query(
        `
        SELECT p.code AS program,
          COALESCE(SUM(r.amount) FILTER (WHERE r.amount > 0), 0)::numeric AS value
        FROM receipts r
        JOIN enrollments e ON e.id = r.enrollment_id
        JOIN programs p ON p.id = e.program_id
        WHERE r.payment_date >= ${monthStart} AND r.payment_date < ${monthEnd}
        GROUP BY p.code
        ORDER BY value DESC;
        `,
      ),
      this.db.query(
        `
        SELECT
          (
            SELECT COALESCE(SUM(amount), 0)::numeric FROM receipts
            WHERE payment_date >= date_trunc('month', CURRENT_DATE)::date
              AND payment_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
              AND amount > 0
          ) AS cash,
          (
            SELECT COALESCE(SUM(tuition_fee), 0)::numeric FROM enrollments
            WHERE enrolled_at >= date_trunc('month', CURRENT_DATE)
              AND enrolled_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
          ) AS accrual
        ;
        `,
      ),
    ]);

    const ca = cashAccr.rows[0] as { cash: string; accrual: string } | undefined;

    return {
      topDebtors: (debtors.rows as TopDebtorRow[]).map((d) => ({
        ...d,
        debt: Number(d.debt) || 0,
      })),
      teachersPendingPayroll: teachers.rows as TeacherPayrollPendingRow[],
      revenueByProgram: (byProg.rows as { program: string; value: string }[]).map((r) => ({
        program: r.program,
        value: Number(r.value) || 0,
      })),
      cashThisMonth: Number(ca?.cash) || 0,
      accrualThisMonth: Number(ca?.accrual) || 0,
    };
  }

  private async fetchTeacherSlice(userId: string): Promise<TeacherDashboardSlice> {
    const { rows: urows } = await this.db.query(
      `SELECT salary_per_session, allowance FROM users WHERE id = $1`,
      [userId],
    );
    const u = urows[0] as { salary_per_session: string | null; allowance: string | null } | undefined;
    const perSession = Number(u?.salary_per_session) || 0;
    const allowance = Number(u?.allowance) || 0;

    const monthStart = `date_trunc('month', CURRENT_DATE)::date`;
    const monthEnd = `(date_trunc('month', CURRENT_DATE) + interval '1 month')::date`;

    const { rows: counts } = await this.db.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE s.status = 'completed'
            AND s.session_date >= ${monthStart}
            AND s.session_date < ${monthEnd}
        )::int AS done,
        COUNT(*) FILTER (
          WHERE s.status = 'pending'
            AND s.session_date >= CURRENT_DATE
            AND s.session_date < ${monthEnd}
        )::int AS remaining
      FROM sessions s
      WHERE s.teacher_id = $1
         OR EXISTS (
           SELECT 1 FROM session_covers sc
           WHERE sc.session_id = s.id AND sc.cover_teacher_id = $1
             AND sc.status IN ('pending','confirmed','completed')
         );
      `,
      [userId],
    );
    const c = counts[0] as { done: number; remaining: number };

    const done = Number(c?.done) || 0;
    const remaining = Number(c?.remaining) || 0;
    const estimated = done * perSession + allowance;

    const weekDays = await this.buildTeacherWeek(userId);

    return {
      sessionsDoneThisMonth: done,
      sessionsRemainingThisMonth: remaining,
      estimatedSalaryMonth: estimated,
      salaryPerSession: perSession,
      weekDays,
    };
  }

  private async buildTeacherWeek(userId: string): Promise<TeacherWeekDay[]> {
    const { rows } = await this.db.query(
      `
      SELECT
        s.id,
        s.session_date::text AS d,
        s.shift,
        s.status,
        c.class_code,
        rm.room_code AS room_name
      FROM sessions s
      JOIN classes c ON c.id = s.class_id
      JOIN rooms rm ON rm.id = c.room_id
      WHERE s.session_date >= CURRENT_DATE
        AND s.session_date < CURRENT_DATE + interval '7 days'
        AND s.status <> 'cancelled'
        AND (
          s.teacher_id = $1
          OR EXISTS (
            SELECT 1 FROM session_covers sc
            WHERE sc.session_id = s.id AND sc.cover_teacher_id = $1
              AND sc.status IN ('pending','confirmed','completed')
          )
        )
      ORDER BY s.session_date, s.shift, c.class_code;
      `,
      [userId],
    );

    const days: TeacherWeekDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      const isToday = i === 0;
      days.push({ date: iso, label, isToday, sessions: [] });
    }

    const map = new Map(days.map((x) => [x.date, x]));
    for (const r of rows as {
      id: string;
      d: string | Date;
      shift: number;
      status: string;
      class_code: string;
      room_name: string;
    }[]) {
      const dStr =
        r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d).slice(0, 10);
      const bucket = map.get(dStr);
      if (!bucket) continue;
      const now = new Date();
      const sd = new Date(dStr + 'T12:00:00');
      const sameDay =
        sd.getFullYear() === now.getFullYear() &&
        sd.getMonth() === now.getMonth() &&
        sd.getDate() === now.getDate();
      const st = sameDay
        ? this.sessionStatusLabel(r.status, dStr, r.shift)
        : { label: 'Sắp tới', highlight: false };
      const canAttendance =
        sameDay && r.status === 'pending' && (st.label === 'Đang dạy' || st.label === 'Sắp dạy');
      bucket.sessions.push({
        id: r.id,
        classCode: r.class_code,
        shift: r.shift,
        shiftLabel: r.shift === 1 ? 'Ca 1' : 'Ca 2',
        roomName: r.room_name,
        status: r.status,
        canAttendance: Boolean(canAttendance),
      });
    }

    return days;
  }
}

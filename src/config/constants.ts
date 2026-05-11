export const EIM_PREFIXES = {
  ADMIN:      'ADM',
  ACADEMIC:   'NHV',
  ACCOUNTANT: 'NKT',
  TEACHER:    'GV',
  STUDENT:    'HS',
  KINDY:      'LK',
  STARTERS:   'LS',
  MOVERS:     'LM',
  FLYERS:     'LF',
  RECEIPT:    'PT',
  PAYROLL:    'PL',
  PAUSE:      'BL',
  REFUND:     'HP',
  MAKEUP:     'BB',
} as const;

export type EimPrefixKey = keyof typeof EIM_PREFIXES;

// ---------------------------------------------------------------------------

export const SHIFTS = {
  1: { label: 'Ca 1', start: '18:00', end: '19:30' },
  2: { label: 'Ca 2', start: '19:30', end: '21:00' },
} as const;

export type ShiftNumber = keyof typeof SHIFTS;

// ---------------------------------------------------------------------------

export const CLASS_RULES = {
  MAX_CAPACITY:          12,
  MIN_CAPACITY:          5,
  TOTAL_SESSIONS:        24,
  FREE_PERIOD_SESSIONS:  3,
  MAX_TRANSFERS:         1,
  MAX_UNEXCUSED_ABSENCES: 3,
} as const;

// ---------------------------------------------------------------------------
// Schedule day combos
// ---------------------------------------------------------------------------

export type DayOfWeek = 2 | 3 | 4 | 5 | 6 | 7; // Thứ Hai → Thứ Bảy
export type DayCombo  = [DayOfWeek, DayOfWeek];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  2: 'Thứ Hai',
  3: 'Thứ Ba',
  4: 'Thứ Tư',
  5: 'Thứ Năm',
  6: 'Thứ Sáu',
  7: 'Thứ Bảy',
};

/** T2–T7: chọn đúng 2 ngày; sorted[1] - sorted[0] >= MIN_GAP → không học 2 ngày liền nhau */
export const SCHEDULE_DAYS_MIN = 2 as const;
export const SCHEDULE_DAYS_MAX = 7 as const;
export const SCHEDULE_DAYS_COUNT = 2 as const;
export const SCHEDULE_DAYS_MIN_GAP = 2 as const;

/**
 * Sinh tự động tất cả combo [dayA, dayB] thỏa mãn:
 *  - dayA < dayB (không trùng, không đảo)
 *  - dayB - dayA >= minGap  (cách nhau ít nhất `minGap` ngày)
 *
 * Mặc định: minGap = 2 (không học 2 ngày liên tiếp)
 *
 * Kết quả với days=[2,3,4,5,6,7], minGap=2 (10 combos):
 *   [2,4] [2,5] [2,6] [2,7]
 *   [3,5] [3,6] [3,7]
 *   [4,6] [4,7]
 *   [5,7]
 */
export function generateDayCombos(
  days: DayOfWeek[] = [2, 3, 4, 5, 6, 7],
  minGap = SCHEDULE_DAYS_MIN_GAP,
): DayCombo[] {
  const result: DayCombo[] = [];
  for (let i = 0; i < days.length; i++) {
    for (let j = i + 1; j < days.length; j++) {
      if (days[j] - days[i] >= minGap) {
        result.push([days[i], days[j]]);
      }
    }
  }
  return result;
}

/**
 * Kiểm tra một combo [dayA, dayB] có hợp lệ không.
 * Dùng trong validator Zod hoặc use-case khi admin tự cấu hình combo mới.
 */
export function isValidDayCombo(
  combo: [number, number],
  minGap = SCHEDULE_DAYS_MIN_GAP,
  days: DayOfWeek[] = [2, 3, 4, 5, 6, 7],
): boolean {
  const [a, b] = combo;
  const validDays = days as number[];
  return (
    validDays.includes(a) &&
    validDays.includes(b) &&
    a < b &&
    b - a >= minGap
  );
}

// ---------------------------------------------------------------------------

export const PROGRAM_CODES = ['KINDY', 'STARTERS', 'MOVERS', 'FLYERS'] as const;
export type ProgramCode = typeof PROGRAM_CODES[number];

export const ROLE_CODES = ['ADMIN', 'ACADEMIC', 'ACCOUNTANT', 'TEACHER'] as const;
export type RoleCode = typeof ROLE_CODES[number];

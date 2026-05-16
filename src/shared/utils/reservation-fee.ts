/** Mặc định 20% học phí khi giữ chỗ (Q39, system_config.reservation_fee_ratio). */
export const DEFAULT_RESERVATION_FEE_RATIO = 0.2;

export function computeReservationFee(tuitionFee: number, ratio = DEFAULT_RESERVATION_FEE_RATIO): number {
  return Math.floor(tuitionFee * ratio);
}

export async function getReservationFeeRatio(
  db: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> },
): Promise<number> {
  const res = await db.query(
    `SELECT value FROM system_config WHERE key = 'reservation_fee_ratio' LIMIT 1`,
  );
  const raw = res.rows[0]?.value;
  const n = Number(raw ?? DEFAULT_RESERVATION_FEE_RATIO);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : DEFAULT_RESERVATION_FEE_RATIO;
}

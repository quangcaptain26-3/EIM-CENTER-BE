import { describe, expect, it } from 'vitest';
import { computePaidPositiveTotal } from './center-refund-amount.helper';

describe('computePaidPositiveTotal', () => {
  it('sums only positive receipt amounts', async () => {
    const receiptRepo = {
      findByEnrollment: async () => [
        { amount: 500_000 },
        { amount: 2_000_000 },
        { amount: -500_000 },
        { amount: 0 },
      ],
    };
    const total = await computePaidPositiveTotal(receiptRepo as never, 'enr-1');
    expect(total).toBe(2_500_000);
  });

  it('returns 0 when no positive receipts', async () => {
    const receiptRepo = {
      findByEnrollment: async () => [{ amount: -100_000 }],
    };
    const total = await computePaidPositiveTotal(receiptRepo as never, 'enr-1');
    expect(total).toBe(0);
  });
});

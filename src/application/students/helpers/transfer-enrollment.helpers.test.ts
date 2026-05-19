import { describe, expect, it } from 'vitest';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';
import {
  assertSameProgram,
  assertTargetClassBehindStudent,
  computeNetPaid,
  computeRemainingTuitionValue,
  computeSessionsRemaining,
  computeTransferAmount,
} from './transfer-enrollment.helpers';

describe('transfer-enrollment.helpers', () => {
  describe('computeSessionsRemaining', () => {
    it('returns 24 when no sessions attended', () => {
      expect(computeSessionsRemaining(0)).toBe(24);
    });

    it('returns 14 after 10 sessions', () => {
      expect(computeSessionsRemaining(10)).toBe(14);
    });

    it('returns 0 when all 24 attended', () => {
      expect(computeSessionsRemaining(24)).toBe(0);
    });
  });

  describe('computeRemainingTuitionValue', () => {
    it('pro-rates tuition by remaining sessions', () => {
      expect(computeRemainingTuitionValue(24_000_000, 12)).toBe(12_000_000);
    });
  });

  describe('computeNetPaid', () => {
    it('sums positive and subtracts refunds', () => {
      expect(
        computeNetPaid([
          { amount: 10_000_000 },
          { amount: 5_000_000 },
          { amount: -2_000_000 },
        ]),
      ).toBe(13_000_000);
    });
  });

  describe('computeTransferAmount', () => {
    it('uses full remaining value when fully paid', () => {
      const r = computeTransferAmount(24_000_000, 10, [{ amount: 24_000_000 }]);
      expect(r.sessionsRemaining).toBe(14);
      expect(r.remainingTuitionValue).toBe(14_000_000);
      expect(r.amountTransferred).toBe(14_000_000);
    });

    it('caps transfer at net paid when underpaid', () => {
      const r = computeTransferAmount(24_000_000, 0, [{ amount: 10_000_000 }]);
      expect(r.remainingTuitionValue).toBe(24_000_000);
      expect(r.netPaid).toBe(10_000_000);
      expect(r.amountTransferred).toBe(10_000_000);
    });

    it('returns zero transfer when no payment', () => {
      const r = computeTransferAmount(24_000_000, 5, []);
      expect(r.amountTransferred).toBe(0);
    });
  });

  describe('assertSameProgram', () => {
    it('passes when programs match', () => {
      expect(() => assertSameProgram('a', 'a')).not.toThrow();
    });

    it('throws when programs differ', () => {
      expect(() => assertSameProgram('a', 'b')).toThrow(AppError);
      try {
        assertSameProgram('a', 'b');
      } catch (e) {
        expect((e as AppError).code).toBe(ERROR_CODES.ENROLLMENT_TRANSFER_PROGRAM_MISMATCH);
      }
    });
  });

  describe('assertTargetClassBehindStudent', () => {
    it('passes when class completed is less than student attended', () => {
      expect(() => assertTargetClassBehindStudent(9, 10)).not.toThrow();
    });

    it('throws when class completed equals student attended', () => {
      expect(() => assertTargetClassBehindStudent(10, 10)).toThrow(AppError);
    });

    it('throws when class completed exceeds student attended', () => {
      try {
        assertTargetClassBehindStudent(11, 10);
      } catch (e) {
        expect((e as AppError).code).toBe(ERROR_CODES.ENROLLMENT_TRANSFER_CLASS_PROGRESS);
      }
    });
  });
});

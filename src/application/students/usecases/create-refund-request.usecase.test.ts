import { describe, expect, it, vi } from 'vitest';
import { CreateRefundRequestUseCase } from './create-refund-request.usecase';
import { AppError } from '../../../shared/errors/app-error';

describe('CreateRefundRequestUseCase', () => {
  it('rejects non-ADMIN', async () => {
    const uc = new CreateRefundRequestUseCase(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      uc.execute(
        {
          enrollmentId: '70000000-0000-4000-8000-000000000001',
          reasonType: 'center_unable_to_open',
          reasonDetail: 'x',
        },
        { id: 'u1', role: 'ACCOUNTANT' },
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('sets center_unable_to_open amount from positive receipts', async () => {
    const enrollment = { id: 'enr-1', status: 'active' };
    const created: Record<string, unknown> = {};
    const refundRequestRepo = {
      create: vi.fn().mockImplementation((d) => {
        Object.assign(created, d);
        return { ...d, id: 'hp-1' };
      }),
    };
    const receiptRepo = {
      findByEnrollment: vi.fn().mockResolvedValue([
        { amount: 500_000 },
        { amount: -100_000 },
        { amount: 2_000_000 },
      ]),
    };
    const uc = new CreateRefundRequestUseCase(
      refundRequestRepo as never,
      { findById: vi.fn().mockResolvedValue(enrollment) } as never,
      {} as never,
      { log: vi.fn() } as never,
      receiptRepo as never,
    );

    await uc.execute(
      {
        enrollmentId: '70000000-0000-4000-8000-000000000001',
        reasonType: 'center_unable_to_open',
        reasonDetail: 'Không đủ sĩ số',
      },
      { id: 'admin-1', role: 'ADMIN' },
    );

    expect(created.refundAmount).toBe(2_500_000);
    expect(created.status).toBe('pending');
    expect(created.requestedBy).toBe('admin-1');
  });
});

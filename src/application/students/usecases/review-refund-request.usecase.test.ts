import { describe, expect, it, vi } from 'vitest';
import { ReviewRefundRequestUseCase } from './review-refund-request.usecase';
import { AppError } from '../../../shared/errors/app-error';

describe('ReviewRefundRequestUseCase', () => {
  const request = {
    id: '80000000-0000-4000-8000-000000000001',
    requestCode: 'EIM-HP-1',
    enrollmentId: 'enr-1',
    reasonType: 'center_unable_to_open',
    reasonDetail: 'test',
    refundAmount: 1_000_000,
    status: 'pending' as const,
  };

  const enrollment = { id: 'enr-1', studentId: 'stu-1', status: 'active' };
  const student = { id: 'stu-1', fullName: 'Test', parentName: 'Parent' };

  it('rejects ADMIN from approving', async () => {
    const uc = new ReviewRefundRequestUseCase(
      { findById: vi.fn().mockResolvedValue(request) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      uc.execute(
        { requestId: '80000000-0000-4000-8000-000000000001', status: 'approved' },
        { id: 'a1', role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('allows ACCOUNTANT to approve and create receipt', async () => {
    const receiptRepo = { create: vi.fn().mockResolvedValue({ id: 'r1', receiptCode: 'PT-1' }) };
    const enrollmentRepo = {
      findById: vi.fn().mockResolvedValue(enrollment),
      updateStatus: vi.fn(),
    };
    const enrollmentHistoryRepo = { create: vi.fn() };
    const refundRequestRepo = {
      findById: vi.fn().mockResolvedValue(request),
      updateStatus: vi.fn(),
    };
    const uc = new ReviewRefundRequestUseCase(
      refundRequestRepo as never,
      enrollmentRepo as never,
      enrollmentHistoryRepo as never,
      { findById: vi.fn().mockResolvedValue(student) } as never,
      receiptRepo as never,
      { log: vi.fn() } as never,
    );

    const result = await uc.execute(
      {
        requestId: '80000000-0000-4000-8000-000000000001',
        status: 'approved',
        reviewNote: 'OK',
      },
      { id: 'acc-1', role: 'ACCOUNTANT' },
    );
    expect(result.success).toBe(true);
    expect(receiptRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: -1_000_000 }),
    );
  });
});

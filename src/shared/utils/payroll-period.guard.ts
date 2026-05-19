import { AppError } from '../errors/app-error';
import { ERROR_CODES } from '../errors/error-codes';

/** E8 — không chốt lương cho tháng/năm trong tương lai. */
export function assertPayrollPeriodNotFuture(month: number, year: number): void {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  if (year > cy || (year === cy && month > cm)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      'Không thể chốt lương cho kỳ trong tương lai',
      422,
    );
  }
}

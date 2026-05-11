import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

export class Email {
  private constructor(private readonly value: string) {}

  /**
   * Creates and validates a new Email value object.
   * Throws AppError with VALIDATION_ERROR if the format is invalid.
   */
  static create(raw: string): Email {
    if (!raw || typeof raw !== 'string') {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Email is required.',
        422,
      );
    }

    const normalized = raw.trim().toLowerCase();

    // RFC 5322 simplified regex — covers all practical cases
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!EMAIL_REGEX.test(normalized)) {
      throw new AppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid email format: "${raw}"`,
        422,
      );
    }

    return new Email(normalized);
  }

  /** Returns the email address in lower-case, normalized form. */
  toString(): string {
    return this.value;
  }
}

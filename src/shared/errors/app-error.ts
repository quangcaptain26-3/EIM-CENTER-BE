export class AppError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    httpStatus: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;

    // Fix prototype chain for instanceof checks when targeting ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      name:       this.name,
      code:       this.code,
      message:    this.message,
      httpStatus: this.httpStatus,
      details:    this.details,
    };
  }
}

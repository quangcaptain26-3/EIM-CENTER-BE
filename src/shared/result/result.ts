import { AppError } from '../errors/app-error';

/** Discriminated union thay thế việc throw/catch trong use-case layer */
export type ResultValue<T, E> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };

export class Result<T, E extends Error = AppError> {
  private readonly _inner: ResultValue<T, E>;

  private constructor(inner: ResultValue<T, E>) {
    this._inner = inner;
  }

  // -------------------------------------------------------------------------
  // Constructors
  // -------------------------------------------------------------------------

  static ok<T, E extends Error = AppError>(value: T): Result<T, E> {
    return new Result<T, E>({ ok: true, value });
  }

  static err<T, E extends Error = AppError>(error: E): Result<T, E> {
    return new Result<T, E>({ ok: false, error });
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  get isOk(): boolean {
    return this._inner.ok;
  }

  get isErr(): boolean {
    return !this._inner.ok;
  }

  /**
   * Unwrap the success value.
   * @throws {Error} if this is an Err result
   */
  unwrap(): T {
    if (!this._inner.ok) {
      throw this._inner.error;
    }
    return this._inner.value;
  }

  /**
   * Unwrap the error.
   * @throws {Error} if this is an Ok result
   */
  unwrapErr(): E {
    if (this._inner.ok) {
      throw new Error('Called unwrapErr() on an Ok result');
    }
    return this._inner.error;
  }

  // -------------------------------------------------------------------------
  // Functional combinators
  // -------------------------------------------------------------------------

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._inner.ok) {
      return Result.ok<U, E>(fn(this._inner.value));
    }
    return Result.err<U, E>(this._inner.error);
  }

  mapErr<F extends Error>(fn: (error: E) => F): Result<T, F> {
    if (!this._inner.ok) {
      return Result.err<T, F>(fn(this._inner.error));
    }
    return Result.ok<T, F>((this._inner as { ok: true; value: T }).value);
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this._inner.ok) {
      return fn(this._inner.value);
    }
    return Result.err<U, E>(this._inner.error);
  }

  match<R>(handlers: { ok: (value: T) => R; err: (error: E) => R }): R {
    return this._inner.ok
      ? handlers.ok(this._inner.value)
      : handlers.err(this._inner.error);
  }
}

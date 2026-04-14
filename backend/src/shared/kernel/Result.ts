/**
 * Railway-Oriented Programming pattern for domain operations.
 * Replaces exception-based error handling with explicit success/failure
 * paths, ensuring that domain logic never throws unexpectedly.
 *
 * Usage:
 *   const result = Result.ok<User>(user);
 *   const failure = Result.fail<User>('Email already exists');
 *
 *   if (result.isOk()) {
 *     const user = result.value;
 *   }
 */
export class Result<T> {
  private readonly _isOk: boolean;
  private readonly _value?: T;
  private readonly _error?: string;

  private constructor(isOk: boolean, value?: T, error?: string) {
    this._isOk = isOk;
    this._value = value;
    this._error = error;
  }

  static ok<U>(value: U): Result<U> {
    return new Result<U>(true, value);
  }

  static fail<U>(error: string): Result<U> {
    return new Result<U>(false, undefined, error);
  }

  static combine(results: Result<unknown>[]): Result<void> {
    for (const result of results) {
      if (!result._isOk) {
        return Result.fail(result._error!);
      }
    }
    return Result.ok<void>(undefined);
  }

  isOk(): boolean {
    return this._isOk;
  }

  isFail(): boolean {
    return !this._isOk;
  }

  get value(): T {
    if (!this._isOk) {
      throw new Error('Cannot access value of a failed Result. Check isOk() first.');
    }
    return this._value as T;
  }

  get error(): string {
    if (this._isOk) {
      throw new Error('Cannot access error of a successful Result.');
    }
    return this._error!;
  }

  map<U>(fn: (val: T) => U): Result<U> {
    if (this._isOk) {
      return Result.ok(fn(this._value as T));
    }
    return Result.fail(this._error!);
  }

  flatMap<U>(fn: (val: T) => Result<U>): Result<U> {
    if (this._isOk) {
      return fn(this._value as T);
    }
    return Result.fail(this._error!);
  }
}

import { VError } from 'verror';

export const toErrorStack = (e: Error): string =>
  `${e.message}\n${VError.fullStack(e)}`;

/**
 * Base error type
 */
export abstract class NPTError extends VError {
  protected constructor(name: string, message: string, cause?: Error) {
    super(
      {
        name,
        cause,
      },
      message
    );

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Cache error
 */
export class CacheError extends NPTError {
  constructor(message: string, cause?: Error) {
    super(CacheError.name, message, cause);
  }
}

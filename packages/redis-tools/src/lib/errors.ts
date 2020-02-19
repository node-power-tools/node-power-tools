import VError from 'verror'

export abstract class NPTError extends VError {
  protected constructor(name: string, message: string, cause?: Error) {
    super({
      name,
      cause,
    }, message)
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Error throw if mutex operations fail
 */
export class LockError extends NPTError {
  constructor(message: string, cause?: Error) {
    super(LockError.name, message, cause)
  }
}

/**
 * Error throw if cache operations fail
 */
export class CacheError extends NPTError {
  constructor(message: string, cause?: Error) {
    super(CacheError.name, message, cause)
  }
}

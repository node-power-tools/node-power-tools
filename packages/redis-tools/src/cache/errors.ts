import VError from 'verror'

export const toErrorStack = (e: Error): string => `${e.message}\n${VError.fullStack(e)}`

export abstract class NPTError extends VError {
  protected constructor(name: string, message: string, cause?: Error) {
    super(
      {
        name,
        cause
      },
      message
    )
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Error thrown if mutex operations fail
 */
export class LockError extends NPTError {
  constructor(message: string, cause?: Error) {
    super(LockError.name, message, cause)
  }
}

/**
 * Error thrown if cache operations fail
 */
export class CacheError extends NPTError {
  constructor(message: string, cause?: Error) {
    super(CacheError.name, message, cause)
  }
}

/**
 * Error thrown on cache codec registry errors
 */
export class CodecRegistryError extends NPTError{
  constructor(message: string, cause?: Error) {
    super(CodecRegistryError.name, message, cause)
  }
}

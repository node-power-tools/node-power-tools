import { NPTError } from '../util'

/**
 * Error thrown if mutex operations fail
 */
export class LockError extends NPTError {
  constructor(message: string, cause?: Error) {
    super(LockError.name, message, cause)
  }
}

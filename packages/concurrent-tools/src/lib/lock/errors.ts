/**
 * Error thrown if mutex operations fail
 */
import { NPTError } from '@node-power-tools/npt-common'

export class LockError extends NPTError {
  constructor(message: string, cause?: Error) {
    super(LockError.name, message, cause)
  }
}

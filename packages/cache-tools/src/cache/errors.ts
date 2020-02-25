/**
 * Error thrown if cache operations fail
 */
import { NPTError } from '../util';

export class CacheError extends NPTError {
  constructor(message: string, cause?: Error) {
    super(CacheError.name, message, cause);
  }
}

/**
 * Error thrown on cache codec registry errors
 */
export class CodecRegistryError extends NPTError {
  constructor(message: string, cause?: Error) {
    super(CodecRegistryError.name, message, cause);
  }
}

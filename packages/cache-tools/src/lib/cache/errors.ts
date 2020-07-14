/**
 * Error thrown on cache codec registry errors
 */
import { NPTError } from '@node-power-tools/npt-common';

export class CodecRegistryError extends NPTError {
  constructor(message: string, cause?: Error) {
    super(CodecRegistryError.name, message, cause);
  }
}

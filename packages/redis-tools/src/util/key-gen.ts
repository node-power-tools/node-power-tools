import { createHash } from 'crypto'
import { CacheError } from '../cache'

export enum KeyGenStrategy {
  /**
   * Identity key generation strategy - arg 0 is the key to use
   */
  IDENTITY,
  /**
   * Generate an md5 hash from all argument values.
   */
  HASH,
  /**
   * Specify which argument indexes to pick and then join the values with '_'.
   */
  PICK
}

const SCALAR_KEY = 'SCALAR_VALUE'

/**
 * Key generation functions specified by {@link KeyGenStrategy}
 */
export const KeyGenFunctions = {
  /**
   * Identity generation - use arg 0.
   */
  [KeyGenStrategy.IDENTITY]: (keyGenArgs: any[], args: any[]): string => {
    if (keyGenArgs.length != 1) {
      throw new CacheError('keyGenArgs must contain at least one argument index for strategy IDENTITY')
    }
    return args[0]
  },

  /**
   * Generate an md5 hash from all argument values.
   */
  [KeyGenStrategy.HASH]: (_keyGenArgs: any[], args: any[]): string => {
    if (args.length == 0) {
      return SCALAR_KEY
    }
    const hash = createHash('md5')
    args.forEach(curArg => hash.update(curArg))
    return hash.digest('base64')
  },

  /**
   * Specify which argument indexes to pick and then join the values with '_'.
   */
  [KeyGenStrategy.PICK]: (keyGenArgs: any[], args: any[]): string => {
    if (keyGenArgs.length == 0) {
      throw new CacheError('keyGenArgs must contain at least one argument index for strategy PICK')
    }
    return args.filter((_val, index) => keyGenArgs.indexOf(index) >= 0).join('_')
  }
}

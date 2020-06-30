import { LockFactory, withLock, LockError } from '@node-power-tools/concurrent-tools'
import { NptLogger } from '@node-power-tools/logging-tools'

import { KeyGenStrategy, KeyGenFunctions } from '../../util'

type LockDecoratorFunction = (
  cacheKeyGenStrategy: KeyGenStrategy,
  keyGenArgs: never[],
  lockTtlSeconds: number,
) => Function

/**
 * Build a lock decorator function
 *
 * @param lockFactory The lock factory to use for the generated decorator
 * @param logger Log object to use
 */
export function buildLockDecorator(lockFactory: LockFactory, logger: NptLogger): LockDecoratorFunction {
  /**
   * A decorator factory for decorators that wrap a methods with a lock
   *
   * @param lockKey The key to use when creating the lock
   * @param lockTtlSeconds The lock TTL
   */
  return function(cacheKeyGenStrategy: KeyGenStrategy, keyGenArgs: never[], lockTtlSeconds: number) {
    return function(
      _target: Record<string, never>,
      methodName: string,
      propertyDesciptor: PropertyDescriptor,
    ): PropertyDescriptor {
      const originalFunction = propertyDesciptor.value

      propertyDesciptor.value = async function(this: never, ...args: never[]) {
        // Generate the key
        const lockKey = KeyGenFunctions[cacheKeyGenStrategy || KeyGenStrategy.HASH](keyGenArgs || [], args)

        // Create the lock
        const lock = lockFactory.createLock(lockKey, lockTtlSeconds)
        // Bind "this" to the callback
        const boundOriginalFunction = originalFunction.bind(this)

        try {
          logger.debug(`Attempting to acquire lock in decorator for key ${lock.getLockKey()}`, { methodName })

          return await withLock(lock, boundOriginalFunction)(...args)
        } catch (e) {
          throw new LockError(`Error acquiring lock in decorator for key ${lock.getLockKey()}`, e)
        }
      }

      return propertyDesciptor
    }
  }
}

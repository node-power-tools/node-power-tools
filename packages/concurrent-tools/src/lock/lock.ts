import { LockError } from './errors'

/**
 * A simple mutex-like lock interface that supports retries via {@link #acquire}
 *
 */
export interface Lock {
  /**
   * Try to acquire a lock.  This call will succeed or fail immediately upon examining
   * the response from the underlying lock implementation.
   *
   * @return true if the lock was acquired, false otherwise
   */
  tryAcquire(): Promise<boolean>

  /**
   * Acquire a lock for up to the retries/timeout configured by the underlying implementation
   *
   * @return true if the lock was acquired, false otherwise
   */
  acquire(): Promise<boolean>

  /**
   * Release a lock - this will release the lock held by the underlying implementation before the TTL
   * expires if still locked.
   *
   * @return true if the lock was released successfully, false if unknown as to whether the lock was
   * released successfully
   */
  release(): Promise<boolean>

  /**
   * Release a lock - this will release the lock held by the underlying implementation before the TTL
   * expires if still locked.
   *
   * @param quiet false if this operation should throw an error if the lock was not released
   * successfully
   *
   * @return true if the lock was released successfully, false if unknown as to whether the lock was
   * released successfully
   */
  release(quiet: boolean): Promise<boolean>

  /**
   * Get the underlying lock implementation's key
   */
  getLockKey(): string
}

/**
 * Configuration for locks
 */
export type LockConfig = {
  retryDelayMs: number
  retryJitterMs: number
}

/**
 * Functional wrapper for lock operations
 *
 * @param lock The lock object to use
 * @param asyncFn The function to execute once the lock is successfully acquired
 */
export const withLock = <FT extends (...args: never[]) => never>(
  lock: Lock,
  asyncFn: FT,
): ((...funcArgs: Parameters<FT>) => Promise<ReturnType<FT>>) => {
  return async (...args: Parameters<FT>): Promise<ReturnType<FT>> => {
    try {
      // Acquire the lock
      const locked = await lock.acquire()

      if (locked) {
        // Do the work while we own the lock
        return await asyncFn(...args)
      }
    } catch (e) {
      // Something bad happened while we tried to acquire the lock - throw in the towel
      throw new LockError(`Error acquiring lock for key ${lock.getLockKey()}`, e)
    } finally {
      // Release the lock
      await lock.release()
    }

    // Lock is not owned after a lock attempt, so don't do any work
    throw new LockError(`Lock was not acquired for key ${lock.getLockKey()} so operation was not performed`)
  }
}

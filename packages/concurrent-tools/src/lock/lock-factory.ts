import { Lock, LockConfig } from './lock'

/**
 * A factory for {@link Lock}s
 */
export interface LockFactory {
  /**
   * Create a lock object
   *
   * @param lockKey The lock key to use.  This key is used to enable low contention for locks.
   * @param lockTtlSeconds TTL in seconds for the lock object
   * @param lockConfig An optional lock configuration that overrides the default configuration
   */
  createLock(
    lockKey: string,
    lockTtlSeconds: number,
    lockConfig?: Partial<LockConfig>
  ): Lock;
}

import { ChronoUnit, Instant } from '@js-joda/core'
import { IHandyRedis } from 'handy-redis'
import uuid from 'uuid'
import { Logger } from 'winston'
import { Lock, LockConfig } from '../lock'
import { LockError } from '../errors'
import { sleep } from '../../util/sleep'

export const REDIS_LOCK_PREFIX = 'LOCK_'
const SUCCESS_RES = 'OK'

// Redis Lua command to remove the lock key if the lock owner is the caller
const DELETE_KEY_IF_VALUE_MATCH_CMD = `
  if redis.call("get",KEYS[1]) == ARGV[1] then
    local res = redis.call("del",KEYS[1])
    if res == 1 then
      return "OK"
    else
      return "FAILED"
    end
  else
    return "FAILED"
  end
`

/**
 * Marker interface for Redis locks
 */
export interface RedisLock extends Lock {}

/**
 * A simple, non-distributed Redis lock (mutex) implementation that supports retries if the lock is currently
 * held by another client.
 */
export class SimpleRedisLockImpl implements RedisLock {
  private readonly _log: Logger
  private readonly _redisClient: IHandyRedis
  private readonly _lockConfig: LockConfig
  private readonly _lockKey: string
  private readonly _lockTtlSeconds: number
  private readonly lockUuid = uuid.v4()
  private locked = false

  constructor(log: Logger, redisClient: IHandyRedis, lockConfig: LockConfig, lockKey: string, lockTtlSeconds: number) {
    this._log = log
    this._redisClient = redisClient
    this._lockConfig = lockConfig
    this._lockKey = `${REDIS_LOCK_PREFIX}${lockKey}`
    this._lockTtlSeconds = lockTtlSeconds
  }

  calcRetrySleepTime(): number {
    return this._lockConfig.retryDelayMs + Math.floor(Math.random() * this._lockConfig.retryJitterMs)
  }

  calcEndRetryInstant(startInstant: Instant): Instant {
    return startInstant.plusSeconds(this._lockTtlSeconds)
  }

  public getLockKey(): string {
    return this._lockKey
  }

  public async tryAcquire(): Promise<boolean> {
    try {
      // Try to acquire the lock
      const res = await this._redisClient.set(this._lockKey, this.lockUuid, ['EX', this._lockTtlSeconds], 'NX')
      // Successful?
      this.locked = res === SUCCESS_RES
      return this.locked
    } catch (e) {
      const msg = `Error attempting tryLock for key ${this._lockKey}: ${e.message}`
      this._log.error(msg, { fn: this.tryAcquire.name })
      throw new LockError(msg, e)
    }
  }

  public async acquire(): Promise<boolean> {
    try {
      const startInstant = Instant.now()
      const ttlExpiredInstant = this.calcEndRetryInstant(startInstant)
      let lockAcquired = false
      let timedOut = false

      // Loop until the time out has elapsed or we have acquired the lock
      while (!lockAcquired) {
        // Try once to acquire the lock
        lockAcquired = await this.tryAcquire()

        if (!lockAcquired) {
          // If timed out, give up
          timedOut = Instant.now().isAfter(ttlExpiredInstant)
          if (timedOut) {
            this._log.error(`Timed out during tryLock for key ${this._lockKey}, { fn: this.acquire.name }`)
            break
          }

          // If not locked, sleep for a bit before trying again
          await sleep(this.calcRetrySleepTime())
        } else {
          // We successfully acquired the lock
          this._log.debug(`Lock acquired after ${startInstant.until(Instant.now(), ChronoUnit.MILLIS)}ms`)
        }
      }
    } catch (e) {
      const msg = `Error attempting lock for key ${this._lockKey}: ${e.message}`
      this._log.error(msg, { fn: this.acquire.name })
      throw new LockError(msg, e)
    }

    // Return the lock status
    return this.locked
  }

  public async release(): Promise<boolean> {
    // Only do the work if locked
    if (this.locked) {
      try {
        // Execute the Lua script to unlock if this lock owns the lock key
        const res = await this._redisClient.eval(DELETE_KEY_IF_VALUE_MATCH_CMD, 1, [this._lockKey], [this.lockUuid])
        const success = res === SUCCESS_RES

        if (success) {
          this.locked = false
          this._log.debug(`Lock released for key ${this._lockKey}`, { fn: this.release.name })
        }

        return res
      } catch (e) {
        const msg = `Error attempting released for key ${this._lockKey}: ${e.message}`
        this._log.error(msg, { fn: this.release.name }, { fn: this.release.name })
        return false
      }
    } else {
      return true
    }
  }
}

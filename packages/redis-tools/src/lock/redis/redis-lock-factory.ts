import { IHandyRedis } from 'handy-redis'
import { NptLogger } from '../../logger'
import { LockFactory } from '../lock-factory'
import { Lock, LockConfig } from '../lock'
import { SimpleRedisLockImpl } from './redis-lock'

export interface RedisLockFactory extends LockFactory {}

/**
 * A simple Redis lock factory
 */
export class RedisLockFactoryImpl implements RedisLockFactory {
  private _logger: NptLogger
  private _redisClient: IHandyRedis
  private _lockConfig: LockConfig

  constructor(redisClient: IHandyRedis, lockConfig: LockConfig, logger: NptLogger) {
    this._redisClient = redisClient
    this._lockConfig = lockConfig
    this._logger = logger
  }

  public createLock(lockKey: string, lockTtlSeconds: number, redisLockConfig: Partial<LockConfig> = {}): Lock {
    return new SimpleRedisLockImpl(
      this._logger,
      this._redisClient,
      {
        ...this._lockConfig,
        ...redisLockConfig
      },
      lockKey,
      lockTtlSeconds
    )
  }
}

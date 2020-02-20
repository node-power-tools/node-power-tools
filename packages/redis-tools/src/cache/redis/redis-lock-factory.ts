import { IHandyRedis } from 'handy-redis'
import { LockFactory } from '../lock-factory'
import { Lock, LockConfig } from '../lock'
import { SimpleRedisLockImpl } from './redis-lock'
import { Logger } from 'winston'

export interface RedisLockFactory extends LockFactory {}

/**
 * A simple Redis lock factory
 */
export class RedisLockFactoryImpl implements RedisLockFactory {
  private _logger: Logger
  private _redisClient: IHandyRedis
  private _lockConfig: LockConfig

  constructor(redisClient: IHandyRedis, lockConfig: LockConfig, logger: Logger) {
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

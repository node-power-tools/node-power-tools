import { IHandyRedis } from 'handy-redis'
import {LockFactory} from "../lock-factory";
import {Lock, LockConfig} from "../lock";
import {SimpleRedisLockImpl} from "./redis-lock";
import {createLoggerWithFileContext} from "../../util/log";

export interface RedisLockFactory extends LockFactory {}

/**
 * A simple Redis lock factory
 */
export class RedisLockFactoryImpl implements RedisLockFactory {
  private _log = createLoggerWithFileContext(__filename)
  private _redisClient: IHandyRedis
  private _lockConfig: LockConfig

  constructor(redisClient: IHandyRedis, lockConfig: LockConfig) {
    this._log = createLoggerWithFileContext(__filename)
    this._redisClient = redisClient
    this._lockConfig = lockConfig
  }

  public createLock(lockKey: string, lockTtlSeconds: number, redisLockConfig: Partial<LockConfig> = {}): Lock {
    return new SimpleRedisLockImpl(
      this._log,
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

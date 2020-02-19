import { IHandyRedis } from 'handy-redis'
import { Logger } from 'winston'
import {
  AsyncFunctionInvocation,
  Cache,
  CacheConfig,
  DEFAULT_CACHE_CONFIGURATION,
  ReadThroughRequest
} from '../cache'
import { createLoggerWithFileContext } from '../../util/log'
import { RedisLockFactory } from './redis-lock-factory'
import { Optional } from '../../util/types'
import { buildRegionPrefixedCacheKey } from '../cache-codec'
import { withLock } from '../lock'
import { CacheError } from '../errors'

const CACHE_REGION_PREFIX = 'CACHE_'
const DEFAULT_CACHE_REGION_NAME = `${CACHE_REGION_PREFIX}DEFAULT`
const EXPIRE_COMMAND = 'EX'

/**
 * Marker interface for Redis caches
 */
export interface RedisCache extends Cache {}

/**
 * A Redis backed cache abstraction.
 *
 * Note: This implementation is not cluster aware.  If you require cluster support, consider using
 * https://github.com/gosquared/redis-clustr as your Redis client library.
 */
export class RedisCacheImpl implements RedisCache {
  readonly _log = createLoggerWithFileContext(__filename)
  private readonly _redisClient: IHandyRedis
  private readonly _redisLockFactory: RedisLockFactory

  constructor(redisClient: IHandyRedis, redisLockFactory: RedisLockFactory) {
    this._redisClient = redisClient
    this._redisLockFactory = redisLockFactory
  }

  /**
   * Read through a cache backed by Redis
   *
   * @param readThroughRequest A read through request
   * @return The value returned from the cache or calculated via {@link ReadThroughRequest#readFn}
   */
  public async readThrough<T>({
    cacheRegion = DEFAULT_CACHE_REGION_NAME,
    cacheKey,
    fnInvocation,
    cacheConfig = {}
  }: ReadThroughRequest<T>): Promise<Optional<T>> {
    // Spread the default cache options to support sparsely populated cache options
    const mergedCacheConfig = {
      ...DEFAULT_CACHE_CONFIGURATION,
      ...(cacheConfig || {})
    }

    // Unfortunately, the node-redis library provides no sugar for maintaining hash map TTLs so we can't use HSET with
    // TTL.  To work around this, build the cache key with a region prefix to namespace cache entries :/
    const redisCacheKey = buildRegionPrefixedCacheKey(cacheRegion, cacheKey)

    try {
      // Try to get the value from Redis by key
      const cachedRes = await this._redisClient.get(redisCacheKey)

      // If a value is found, decode and return
      if (cachedRes) {
        return mergedCacheConfig.codec.decode(cachedRes)
      }
    } catch (e) {
      this._log.error(`Error attepmting to retrieve value for key ${cacheKey}: ${e.message}`, { fn: this.readThrough.name })
    }

    let readResult: Optional<T>
    try {
      this._log.debug(`Cache miss for ${cacheKey}`)
      readResult = await this.handleCacheMiss(redisCacheKey, mergedCacheConfig, fnInvocation)
    } catch (e) {
      this._log.error(`Error handling cache miss for key ${cacheKey}: ${e.message}`, { fn: this.readThrough.name })
    }

    // Always return the result even on a cache put fail
    return readResult
  }

  /**
   * Handle a cache miss
   *
   * @param cacheKey The key to use
   * @param cacheConfig Cache configuration
   * @param fnInvocation The function invocation to call to calculate the new value
   */
  async handleCacheMiss<T>(cacheKey: string, cacheConfig: CacheConfig, fnInvocation: AsyncFunctionInvocation<T>): Promise<Optional<T>> {
    let readResult: Optional<T>
    try {
      if (cacheConfig.doubleCheckedPut) {
        // Build a Redis lock
        const redisLock = this._redisLockFactory.createLock(cacheKey, cacheConfig.doubleCheckLockTtlSeconds)
        // Execute a double checked read within a lock
        const wrappedCalcAndSetInCacheFn = withLock(redisLock, doubleCheckedCalcAndSetInCache)
        readResult = await wrappedCalcAndSetInCacheFn(this._log, this._redisClient, cacheKey, cacheConfig, fnInvocation) as Optional<T>
      } else {
        // No double checked locking - just do the work and set in the cache
        readResult = await calcAndSetInCache(this._log, this._redisClient, cacheKey, cacheConfig, fnInvocation)
      }
    } catch (e) {
      this._log.error(`Error attepmting to calculate value for cache key ${cacheKey}: ${e.message}`, { fn: this.handleCacheMiss.name })
    }

    // Always return the result even on a cache put fail
    return readResult
  }
}

/**
 * Fetch an entry from the cache.
 *
 * @param log Logger to use
 * @param redisClient RedisClient to use
 * @param cacheKey The key to use
 * @param cacheConfig Cache configuration
 */
const fetchFromCache = async <T>(log: Logger, redisClient: IHandyRedis, cacheKey: string, cacheConfig: CacheConfig): Promise<Optional<T>> => {
  let cachedRes
  try {
    // Try to get the value from Redis by key
    cachedRes = await redisClient.get(cacheKey)

    // If a value is found, decode and return
    if (cachedRes) {
      return cacheConfig.codec.decode(cachedRes)
    }
  } catch (e) {
    log.error(`Error attepmting to retrieve value from cache for ${cacheKey}: ${e.message}`, { fn: fetchFromCache.name })
  }
  return undefined
}

/**
 * Perform a double-checked get/calculate/set operation.
 *
 * Note this is only useful if wrapped in a lock.
 *
 * @param log Logger to use
 * @param redisClient RedisClient to use
 * @param cacheKey The key to use
 * @param cacheConfig Cache configuration
 * @param fnInvocation The function invocation to use for calculating the new value
 */
const doubleCheckedCalcAndSetInCache = async <T>(log: Logger, redisClient: IHandyRedis, cacheKey: string, cacheConfig: CacheConfig, fnInvocation: AsyncFunctionInvocation<T>): Promise<Optional<T>> => {
  try {
    const cachedValue: Optional<T> = await fetchFromCache(log, redisClient, cacheKey, cacheConfig)
    if (cachedValue) {
      log.debug(`Value for ${cacheKey} found in cache during double check - returning value`)
      return cachedValue
    }
    return await calcAndSetInCache(log, redisClient, cacheKey, cacheConfig, fnInvocation)
  } catch (e) {
    throw new CacheError(`Error attepmting to retrieve value from cache or calcAndSetInCache for ${cacheKey}: ${e.message}`, e)
  }
}

/**
 * Calculate the value and set in the Redis cache region
 *
 * @param log Logger to use
 * @param redisClient RedisClient to use
 * @param cacheKey The key to use
 * @param cacheConfig Cache configuration
 * @param fnInvocation The function invocation to use for calculating the new value
 */
const calcAndSetInCache = async <T>(log: Logger, redisClient: IHandyRedis, cacheKey: string, cacheConfig: CacheConfig, fnInvocation: AsyncFunctionInvocation<T>): Promise<Optional<T>> => {
  let calculatedResult
  try {
    calculatedResult = await fnInvocation.readFn(...fnInvocation.args)
  } catch (e) {
    // If the read fails, don't poison the cache
    throw new CacheError(`Error calculating result after cache miss for ${cacheKey}: ${e.message}`, e)
  }

  // Only cache if the result is defined or non-null
  if (calculatedResult) {
    try {
      // Set in Redis with the specified TTL
      await redisClient.set(cacheKey, cacheConfig.codec.encode(calculatedResult), [EXPIRE_COMMAND, cacheConfig.ttlSeconds])
      log.debug(`Cached ${cacheKey} with ttl of ${cacheConfig.ttlSeconds}s`)
    } catch (e) {
      log.error(`Error setting fetched result in Redis after cache miss for ${cacheKey}: ${e.message}`, { fn: calcAndSetInCache.name })
    }
  } else {
    log.debug(`Not caching read result in Redis  - value is undefined after read for key ${cacheKey}`, { fn: calcAndSetInCache.name })
  }

  return calculatedResult
}

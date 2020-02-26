import { IHandyRedis } from 'handy-redis'
import { NptLogger } from '../../logger'
import { Optional, toErrorStack } from '../../util'
import {
  AsyncFunctionInvocation,
  Cache,
  CacheConfig,
  DEFAULT_CACHE_CONFIGURATION,
  PutRequest,
  ReadThroughRequest
} from '../cache'
import { CacheKeyEntry, CacheManager } from '../cache-manager'
import { RedisLockFactory } from '../../lock'
import {
  buildCacheKeyRegionPrefix,
  buildRegionPrefixedCacheKey,
  CacheCodec,
  codecRegistry,
  extractCacheRegionNameFromCacheKey,
  extractKeyFromRegionPrefixedCacheKey
} from '../cache-codec'
import { withLock } from '../../lock'
import { CacheError } from '../errors'

const CACHE_REGION_PREFIX = 'CACHE_'
const DEFAULT_CACHE_REGION_NAME = `${CACHE_REGION_PREFIX}DEFAULT`
const EXPIRE_COMMAND = 'EX'

/**
 * Marker interface for Redis caches
 */
export interface RedisCache extends Cache, CacheManager {}

/**
 * A Redis backed cache abstraction.
 *
 * Note: This implementation is not cluster aware.  If you require cluster support, consider using
 * https://github.com/gosquared/redis-clustr as your Redis client library.
 */
export class RedisCacheImpl implements RedisCache {
  private readonly _redisClient: IHandyRedis
  private readonly _redisLockFactory: RedisLockFactory
  private readonly _log: NptLogger

  constructor(redisClient: IHandyRedis, redisLockFactory: RedisLockFactory, logger: NptLogger) {
    this._redisClient = redisClient
    this._redisLockFactory = redisLockFactory
    this._log = logger
  }

  /**
   * Spread the provided cache configuration over the default configuration
   *
   * @param cacheConfig The optional partial cache configuration
   */
  private static mergeCacheConfigWithDefault(cacheConfig?: Partial<CacheConfig>): CacheConfig {
    return {
      ...DEFAULT_CACHE_CONFIGURATION,
      ...(cacheConfig || {})
    }
  }

  /**
   * Get from the cache
   *
   * @param cacheKey The cache
   * @param cacheRegion The optional cache region name - will be defaulted
   *        if not provided
   */
  public async get<T>(cacheKey: string, cacheRegion: string = DEFAULT_CACHE_REGION_NAME): Promise<Optional<T>> {
    const redisCacheKey = buildRegionPrefixedCacheKey(cacheRegion, cacheKey)
    try {
      return await fetchFromCache(this._redisClient, redisCacheKey)
    } catch (e) {
      throw new CacheError(`Error attempting to get value from cache for region ${cacheRegion} and key ${cacheKey}`, e)
    }
  }

  /**
   * Put a value into the cache
   *
   * @param putRequest The put request
   */
  public async put<T>(putRequest: PutRequest<T>): Promise<void> {
    const redisCacheKey = buildRegionPrefixedCacheKey(putRequest.cacheRegion || DEFAULT_CACHE_REGION_NAME, putRequest.cacheKey)
    const mergedCacheConfig = RedisCacheImpl.mergeCacheConfigWithDefault(putRequest.cacheConfig)
    try {
      return await setInCache(this._log, this._redisClient, redisCacheKey, mergedCacheConfig, putRequest.value)
    } catch (e) {
      throw new CacheError(`Error attempting to set value in Redis for region ${putRequest.cacheRegion} and key ${putRequest.cacheKey}`, e)
    }
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
  }: ReadThroughRequest<T>): Promise<T> {
    // Spread the default cache options to support sparsely populated cache options
    const mergedCacheConfig = RedisCacheImpl.mergeCacheConfigWithDefault(cacheConfig)

    const redisCacheKey = buildRegionPrefixedCacheKey(cacheRegion, cacheKey)
    try {
      // Try to get the value from Redis by key
      const cachedRes = await this._redisClient.get(redisCacheKey)

      // If a value is found, decode and return
      const res = CacheCodec.decode<T>(cachedRes)
      if (res) {
        return res
      }
    } catch (e) {
      this._log.error(`Error attempting to retrieve value for key ${cacheKey}`, {
        fn: this.readThrough.name
      })
    }

    try {
      this._log.debug(`Cache miss for ${cacheKey}`)
      return await this.handleCacheMiss(redisCacheKey, mergedCacheConfig, fnInvocation)
    } catch (e) {
      throw new CacheError(`Error handling cache miss for key ${cacheKey}`, e)
    }
  }

  /**
   * Handle a cache miss
   *
   * @param cacheKey The key to use
   * @param cacheConfig Cache configuration
   * @param fnInvocation The function invocation to call to calculate the new value
   */
  async handleCacheMiss<T>(
    cacheKey: string,
    cacheConfig: CacheConfig,
    fnInvocation: AsyncFunctionInvocation<T>
  ): Promise<T> {
    try {
      if (cacheConfig.doubleCheckedPut) {
        // Build a Redis lock
        const redisLock = this._redisLockFactory.createLock(cacheKey, cacheConfig.doubleCheckLockTtlSeconds)
        // Execute a double checked read within a lock
        const wrappedCalcAndSetInCacheFn = withLock(redisLock, doubleCheckedCalcAndSetInCache)
        return  (
          await wrappedCalcAndSetInCacheFn(
            this._log,
            this._redisClient,
            cacheKey,
            cacheConfig,
            fnInvocation
          )) as T
      } else {
        // No double checked locking - just do the work and set in the cache
        return await readAndSetInCache(this._log, this._redisClient, cacheKey, cacheConfig, fnInvocation)
      }
    } catch (e) {
      throw new CacheError(`Error attempting to calculate value for cache key ${cacheKey}`, e)
    }
  }

  /**
   * Get active cache region names.
   *
   * @return {@link string[]} of cache region names
   */
  async getCacheRegionNames(): Promise<string[]> {
    try {
      const keys = await this._redisClient.keys(`${CACHE_REGION_PREFIX}*`)
      const uniqueRegions = new Set(keys.map(key => extractCacheRegionNameFromCacheKey(key)))
      return Array.from(uniqueRegions)
    } catch (e) {
      this._log.error(`Error attempting to retrieve cache region names: ${toErrorStack(e)}`, {
        fn: this.getCacheRegionNames.name
      })
    }
    return []
  }

  /**
   * Get active cache keys with their TTL.
   *
   * @return {@link CacheKeyEntry[]}
   */
  async getCacheKeys(cacheRegionName: string): Promise<CacheKeyEntry[]> {
    try {
      // Try to get the value from Redis by key
      const keys = await this._redisClient.keys(`${buildCacheKeyRegionPrefix(cacheRegionName)}*`)
      const res = []
      for await (const key of keys) {
        const ttlSeconds = await this._redisClient.ttl(key)
        res.push({
          cacheKey: extractKeyFromRegionPrefixedCacheKey(key),
          ttlSeconds: ttlSeconds
        })
      }
      return res
    } catch (e) {
      this._log.error(
        `Error attempting to retrieve cache key names or TTL values for region ${cacheRegionName}: ${toErrorStack(e)}`,
        { fn: this.getCacheKeys.name }
      )
    }
    return []
  }

  /**
   * Invalidate a cache region.
   *
   * @param cacheRegionName The cache region to invalidate
   * @return true if invalidated, false otherwise
   */
  async invalidateCacheRegion(cacheRegionName: string): Promise<boolean> {
    try {
      const keys = await this.getCacheKeys(cacheRegionName)
      this._log.debug(`invalidateCacheRegion: Invalidating ${keys.length} cache keys for cache region ${cacheRegionName}`)
      for await (const key of keys) {
        await this.invalidateCacheKey(cacheRegionName, key.cacheKey)
      }
      return true
    } catch (e) {
      this._log.error(`Error attempting to invalidate cache region ${cacheRegionName}: ${toErrorStack(e)}`, {
        fn: this.invalidateCacheRegion.name
      })
    }
    return false
  }

  /**
   * Invalidate a cache key.
   *
   * @param cacheRegionName The cache region name for the cache key to invalidate
   * @param cacheKey The cache key to invalidate
   * @return true if invalidated, false otherwise
   */
  async invalidateCacheKey(cacheRegionName: string, cacheKey: string): Promise<boolean> {
    const key = buildRegionPrefixedCacheKey(cacheRegionName, cacheKey)
    try {
      this._log.debug(`invalidateCacheKey: Invalidating cache key ${key}`)
      const res = await this._redisClient.del(key)
      return res === 1
    } catch (e) {
      this._log.error(`Error attempting to invalidate cache key ${cacheRegionName}: ${toErrorStack(e)}`, {
        fn: this.invalidateCacheRegion.name
      })
    }
    return false
  }
}

/**
 * Fetch an entry from the cache.
 *
 * @param redisClient RedisClient to use
 * @param cacheKey The key to use
 */
const fetchFromCache = async <T>(redisClient: IHandyRedis, cacheKey: string): Promise<T | undefined> => {
  try {
    // Try to get the value from Redis by key
    const cachedRes = await redisClient.get(cacheKey)

    // If a value is found, decode and return
    return CacheCodec.decode<T>(cachedRes)
  } catch (e) {
    throw new CacheError(`Error attempting to retrieve value from cache for ${cacheKey}`, e)
  }
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
const doubleCheckedCalcAndSetInCache = async <T>(
  log: NptLogger,
  redisClient: IHandyRedis,
  cacheKey: string,
  cacheConfig: CacheConfig,
  fnInvocation: AsyncFunctionInvocation<T>
): Promise<T> => {
  try {
    const cachedValue: T | undefined = await fetchFromCache(redisClient, cacheKey)
    if (cachedValue) {
      log.debug(`Value for ${cacheKey} found in cache during double check - returning value`)
      return cachedValue
    }
    return await readAndSetInCache(log, redisClient, cacheKey, cacheConfig, fnInvocation)
  } catch (e) {
    throw new CacheError(`Error attempting to retrieve value from cache or calcAndSetInCache for ${cacheKey}`, e)
  }
}

/**
 * Read the value and set in the Redis cache region
 *
 * @param log Logger to use
 * @param redisClient RedisClient to use
 * @param cacheKey The key to use
 * @param cacheConfig Cache configuration
 * @param fnInvocation The function invocation to use for calculating the new value
 */
const readAndSetInCache = async <T>(
  log: NptLogger,
  redisClient: IHandyRedis,
  cacheKey: string,
  cacheConfig: CacheConfig,
  fnInvocation: AsyncFunctionInvocation<T>
): Promise<T> => {
  let calculatedResult
  try {
    calculatedResult = await fnInvocation.readFn(...fnInvocation.args)
  } catch (e) {
    // If the read fails, don't poison the cache
    throw new CacheError(`Error calculating result after cache miss for ${cacheKey}`, e)
  }

  // Only cache if the result is defined or non-null
  if (calculatedResult) {
    try {
      setInCache(log, redisClient, cacheKey, cacheConfig, calculatedResult)
    } catch (e) {
      log.error(`Error setting fetched result in Redis after cache miss for ${cacheKey}: ${toErrorStack(e)}`, {
        fn: readAndSetInCache.name
      })
    }
  } else {
    log.debug(`Not caching read result in Redis  - value is undefined after read for key ${cacheKey}`, {
      fn: readAndSetInCache.name
    })
  }

  return calculatedResult
}

const setInCache = async <T>(
  log: NptLogger,
  redisClient: IHandyRedis,
  cacheKey: string,
  cacheConfig: CacheConfig,
  value: any
): Promise<void> => {
  try {
    // Set in Redis with the specified TTL
    const codec = codecRegistry.getCodecInstance(cacheConfig.codecId)
    const encodedObject = codec.encode<T>(value)
    await redisClient.set(cacheKey, encodedObject, [
      EXPIRE_COMMAND,
      cacheConfig.ttlSeconds
    ])
    log.debug(`Cached ${cacheKey} with ttl of ${cacheConfig.ttlSeconds}s`)
  } catch (e) {
    log.error(`Error setting value in Redis for ${cacheKey}: ${toErrorStack(e)}`, {
      fn: readAndSetInCache.name
    })
  }
}

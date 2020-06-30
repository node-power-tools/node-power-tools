import { NptLogger } from '@node-power-tools/logging-tools'
import { IHandyRedis } from 'handy-redis'

import { toErrorStack } from '../../util'
import { AsyncFunctionInvocation, CacheConfig, DEFAULT_CACHE_CONFIGURATION } from '../cache'
import { CacheCodec, codecRegistry } from '../cache-codec'
import { CacheError } from '../errors'

const EXPIRE_COMMAND = 'EX'

/**
 * Spread the provided cache configuration over the default configuration
 *
 * @param cacheConfig The optional partial cache configuration
 */
export const mergeCacheConfigWithDefault = (cacheConfig?: Partial<CacheConfig>): CacheConfig => {
  return {
    ...DEFAULT_CACHE_CONFIGURATION,
    ...(cacheConfig || {}),
  }
}

/**
 * Fetch an entry from the cache.
 *
 * @param redisClient RedisClient to use
 * @param cacheKey The key to use
 */
export const fetchFromCache = async <T>(redisClient: IHandyRedis, cacheKey: string): Promise<T | undefined> => {
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
 * Set a value in the cache
 *
 * @param log Logger to use
 * @param redisClient RedisClient to use
 * @param cacheKey The key to use
 * @param cacheConfig Cache configuration
 * @param value The value to set
 */
export const setInCache = async <T>(
  log: NptLogger,
  redisClient: IHandyRedis,
  cacheKey: string,
  cacheConfig: CacheConfig,
  value: T,
): Promise<void> => {
  try {
    // Set in Redis with the specified TTL
    const codec = codecRegistry.getCodecInstance(cacheConfig.codecId)
    const encodedObject = codec.encode<T>(value)
    await redisClient.set(cacheKey, encodedObject, [EXPIRE_COMMAND, cacheConfig.ttlSeconds])
    log.debug(`Cached ${cacheKey} with ttl of ${cacheConfig.ttlSeconds}s`)
  } catch (e) {
    log.error(`Error setting value in Redis for ${cacheKey}: ${toErrorStack(e)}`, {
      fn: setInCache.name,
    })
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
export const readAndSetInCache = async <T>(
  log: NptLogger,
  redisClient: IHandyRedis,
  cacheKey: string,
  cacheConfig: CacheConfig,
  fnInvocation: AsyncFunctionInvocation<T>,
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
        fn: readAndSetInCache.name,
      })
    }
  } else {
    log.debug(`Not caching read result in Redis  - value is undefined after read for key ${cacheKey}`, {
      fn: readAndSetInCache.name,
    })
  }

  return calculatedResult
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
export const doubleCheckedCalcAndSetInCache = async <T>(
  log: NptLogger,
  redisClient: IHandyRedis,
  cacheKey: string,
  cacheConfig: CacheConfig,
  fnInvocation: AsyncFunctionInvocation<T>,
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

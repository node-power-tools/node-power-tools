import { AsyncFunction, Optional } from '../util'
import { CacheError } from './errors'
import { SimpleJsonCodec } from './cache-codec'
import { NptLogger } from '@node-power-tools/logging-tools'

/**
 * Cache configuration for a cache request.
 */
export interface CacheConfig {
  /**
   * TTL in seconds for the data if a put operation is necessary
   */
  ttlSeconds: number;
  /**
   * True if the underlying caching mechanism should utilize double checked locking to avoid cache stampeding.  This
   * flag is relevant for long running or expensive fetchFn operations.
   */
  doubleCheckedPut: boolean;
  /**
   * Seconds that the underlying locking mechanism should utilize for the lock TTL when performing double-checked puts
   */
  doubleCheckLockTtlSeconds: number;
  /**
   * Codec id for serialization/deserialization of cached values in the underlying cache
   */
  codecId: string;
}

/**
 * A sparse cache configuration
 */
export type PartialCacheConfig =
  | NonNullable<Pick<CacheConfig, 'ttlSeconds' | 'doubleCheckedPut'>>
  | Pick<CacheConfig, 'doubleCheckLockTtlSeconds' | 'codecId'>;

/**
 * A default cache configuration
 */
export const DEFAULT_CACHE_CONFIGURATION: CacheConfig = {
  ttlSeconds: 60,
  doubleCheckedPut: false,
  doubleCheckLockTtlSeconds: 30,
  codecId: SimpleJsonCodec.ID,
}

/**
 * A cache configurations collection indexed by cache region name
 */
export type CacheConfigurations = {
  [key: string]: PartialCacheConfig;
};

/**
 * Factory to build a {@link CacheConfigurations} object
 */
export const buildCacheConfigurations = (
  cacheConfigurations: CacheConfigurations,
  defaultConfig: CacheConfig,
  logger: NptLogger
) => (cacheName: string): CacheConfig => {
  const config = cacheConfigurations[cacheName] || {}

  if (!config) {
    logger.warn(
      `No cache configuration found for cache name ${cacheName} - defaulting configuration`
    )
  }

  // Provide a default configuration for non-configured caches
  return {
    ...defaultConfig,
    ...config,
  }
}

/**
 * A caching request
 */
export interface CacheRequest {
  /**
   *  Optional cache region name - will be defaulted if not included
   */
  cacheRegion?: string;
  /**
   * The cache key to use
   */
  cacheKey: string;
  /**
   * Cache configuration to use for the request
   */
  cacheConfig?: Partial<CacheConfig>;
}

/**
 * An async function invocation
 */
export interface AsyncFunctionInvocation<T> {
  readFn: AsyncFunction<T>;
  args: any[];
}

/**
 * A read through request
 */
export interface ReadThroughRequest<T> extends CacheRequest {
  fnInvocation: AsyncFunctionInvocation<T>;
}

/**
 * A put request
 */
export interface PutRequest<T> extends CacheRequest {
  value: T;
}

/**
 * Caching interface
 */
export interface Cache {
  /**
   * Get from the cache
   *
   * @param cacheKey The cache
   * @param cacheRegion The optional cache region name - will be defaulted
   *        if not provided
   * @return The cached value
   */
  get<T>(cacheKey: string, cacheRegion?: string): Promise<Optional<T>>;

  /**
   * Put a value into the cache
   *
   * @param putRequest The put request
   */
  put<T>(putRequest: PutRequest<T>): Promise<void>;

  /**
   * Read through a cache
   *
   * @param readThroughRequest A read through request
   * @return The value returned from the cache or calculated via {@link ReadThroughRequest#readFn}
   */
  readThrough<T>(readThroughRequest: ReadThroughRequest<T>): Promise<T>;

  /**
   * Invalidate a cache region.
   *
   * @param cacheRegionName The cache region to invalidate
   * @return true if invalidated, false otherwise
   */
  invalidateCacheRegion(cacheRegionName: string): Promise<boolean>;

  /**
   * Invalidate a cache key.
   *
   * @param cacheRegionName The cache region name for the cache key to invalidate
   * @param cacheKey The cache key to invalidate
   * @return true if invalidated, false otherwise
   */
  invalidateCacheKey(
    cacheRegionName: string,
    cacheKey: string
  ): Promise<boolean>;
}

/**
 * Function wrapper for read through caching
 *
 * @param cache The cache object to use
 * @param cacheRequest The cache request
 */
export function withReadThroughCache<FT extends(...args: any[]) => any>(
  cache: Cache,
  cacheRequest: ReadThroughRequest<ReturnType<FT>>
): (...funcArgs: Parameters<FT>) => Promise<ReturnType<FT>> {
  return async (): Promise<ReturnType<FT>> => {
    try {
      return await cache.readThrough(cacheRequest)
    } catch (e) {
      throw new CacheError(
        `Error during read through attempt for read through request for key ${cacheRequest.cacheKey}`,
        e
      )
    }
  }
}

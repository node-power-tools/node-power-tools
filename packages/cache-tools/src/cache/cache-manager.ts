export type CacheKeyEntry = {
  cacheKey: string;
  ttlSeconds: number;
};

/**
 * Cache manager interface
 */
export interface CacheManager {
  /**
   * Get active cache region names.
   *
   * @return {@link string[]} of cache region names
   */
  getCacheRegionNames(): Promise<string[]>;

  /**
   * Get active cache keys with their TTL.
   *
   * @return {@link CacheKeyEntry[]}
   */
  getCacheKeys(cacheRegionName: string): Promise<CacheKeyEntry[]>;

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

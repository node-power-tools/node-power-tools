import { CacheError } from './errors'
import {
  Cache,
  CacheConfig,
  CacheKeyGenFunctions,
  CacheKeyGenStrategy,
  PartialCacheConfig,
  withReadThroughCache
} from './cache'
import { Logger } from 'winston'

export type CacheDecoratorFunction = (
  cacheKeyGenStrategy?: CacheKeyGenStrategy,
  keyGenArgs?: any[],
  regionName?: string
) => Function
export type CacheConfigLookupFunction = (cacheName: string) => NonNullable<CacheConfig>

/**
 * Build a cache decorator function
 *
 * @param cache The cache to use
 * @param cacheConfigLookupFunction Function that provides lookup for cache configuration
 * @param logger Logger to use
 */
export function buildCacheDecorator(
  cache: Cache,
  cacheConfigLookupFunction: CacheConfigLookupFunction,
  logger: Logger
): CacheDecoratorFunction {
  /**
   * A decorator to wrap a method with read through caching
   *
   * @param cacheKeyGenFn Function that will generate the cache key from the function args
   * @param regionName Optional cache region name - method name will be used if not provided
   */
  return function(cacheKeyGenStrategy?: CacheKeyGenStrategy, keyGenArgs?: any[], regionName?: string, cacheConfiguration?: PartialCacheConfig): Function {
    return function(
      _target: Record<string, any>,
      methodName: string,
      propertyDesciptor: PropertyDescriptor
    ): PropertyDescriptor {
      const originalFunction = propertyDesciptor.value

      propertyDesciptor.value = async function(this: any, ...args: any[]) {
        // Default the region name to the method name if not defined
        const cacheRegionName = regionName || methodName
        // Generate the cache key
        const cacheKey = CacheKeyGenFunctions[cacheKeyGenStrategy || CacheKeyGenStrategy.HASH](keyGenArgs || [], args)
        // Look up or default the cache configuration.  Specified cache configuration will override the config looked up.
        const mergedCacheConfig = {
          ...cacheConfigLookupFunction(cacheRegionName),
          ...(cacheConfiguration || {})
        }
        // Bind "this" to the callback
        const boundOriginalFunction = originalFunction.bind(this)
        try {
          logger.debug(`Attempting to read through cache in decorator for key ${cacheKey}`, { methodName })
          return await withReadThroughCache(cache, {
            cacheRegion: cacheRegionName,
            cacheKey: cacheKey,
            fnInvocation: {
              readFn: boundOriginalFunction,
              args
            },
            cacheConfig: mergedCacheConfig
          })(...args)
        } catch (e) {
          throw new CacheError(
            `Error attempting to read through cache in decorator for key ${args[1]}: ${e.message}`,
            e
          )
        }
      }

      return propertyDesciptor
    }
  }
}

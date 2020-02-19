import {createLoggerWithFileContext} from "../util/log";
import {CacheError} from "./errors";
import {
  Cache,
  CacheConfig,
  CacheKeyGenFunctions,
  CacheKeyGenStrategy,
  withReadThroughCache
} from "./cache";

const log = createLoggerWithFileContext(__filename)

export type CacheDecoratorFunction = (cacheKeyGenStrategy?: CacheKeyGenStrategy, keyGenArgs?: any[], regionName?: string) => Function
export type CacheConfigLookupFunction = (cacheName: string) => NonNullable<CacheConfig>

/**
 * Build a cache decorator function
 *
 * @param cache The cache to use
 * @param cacheConfigLookupFunction Function that provides lookup for cache configuration
 */
export function buildCacheDecorator(cache: Cache, cacheConfigLookupFunction: CacheConfigLookupFunction): CacheDecoratorFunction {
  /**
   * A decorator to wrap a method with read through caching
   *
   * @param cacheKeyGenFn Function that will generate the cache key from the function args
   * @param regionName Optional cache region name - method name will be used if not provided
   */
  return function(cacheKeyGenStrategy?: CacheKeyGenStrategy, keyGenArgs?: any[], regionName?: string): Function {
    return function(_target: Record<string, any>, methodName: string, propertyDesciptor: PropertyDescriptor): PropertyDescriptor {
      const originalFunction = propertyDesciptor.value

      propertyDesciptor.value = async function(this: any, ...args: any[]) {
        // Default the region name to the method name if not defined
        const cacheRegionName = regionName || methodName
        // Generate the cache key
        const cacheKey = CacheKeyGenFunctions[cacheKeyGenStrategy || CacheKeyGenStrategy.HASH](keyGenArgs || [], args)
        // Look up or default the cache configuration
        const cacheConfig = cacheConfigLookupFunction(cacheRegionName)
        // Bind "this" to the callback
        const boundOriginalFunction = originalFunction.bind(this)
        try {
          log.debug(`Attempting to read through cache in decorator for key ${cacheKey}`, { methodName })
          return await withReadThroughCache(cache, {
            cacheRegion: cacheRegionName,
            cacheKey: cacheKey,
            fnInvocation: {
              readFn: boundOriginalFunction,
              args
            },
            cacheConfig
          })(...args)
        } catch (e) {
          throw new CacheError(`Error attempting to read through cache in decorator for key ${args[1]}: ${e.message}`, e)
        }
      }

      return propertyDesciptor
    }
  }
}

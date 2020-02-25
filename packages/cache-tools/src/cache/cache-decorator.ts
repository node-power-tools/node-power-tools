import { KeyGenFunctions, KeyGenStrategy } from '../util';
import { CacheError } from './errors';
import {
  Cache,
  CacheConfig,
  PartialCacheConfig,
  withReadThroughCache,
} from './cache';
import { NptLogger } from '@node-power-tools/logging-tools';

export type KeyGeneratorFunction = (
  keyGenStrategy?: KeyGenStrategy,
  keyGenArgs?: any[],
  regionName?: string
) => Function;
export type CacheConfigLookupFunction = (
  cacheName: string
) => NonNullable<CacheConfig>;

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
  logger: NptLogger
): KeyGeneratorFunction {
  /**
   * A decorator to wrap a method with read through caching
   *
   * @param cacheKeyGenStrategy Strategy that will generate the cache key from the function args
   * @param keyGenArgs Arguments for the key generation strategy
   * @param regionName Optional cache region name - method name will be used if not provided
   */
  return function(
    cacheKeyGenStrategy?: KeyGenStrategy,
    keyGenArgs?: any[],
    regionName?: string,
    cacheConfiguration?: PartialCacheConfig
  ): Function {
    return function(
      target: Record<string, any>,
      methodName: string,
      propertyDesciptor: PropertyDescriptor
    ): PropertyDescriptor {
      const parentClassName = target?.constructor.name || '';
      const originalFunction = propertyDesciptor.value;
      propertyDesciptor.value = async function(this: any, ...args: any[]) {
        // Default the region name to the method name if not defined
        const cacheRegionName =
          regionName || `${parentClassName}#${methodName}`;
        // Generate the cache key
        const cacheKey = KeyGenFunctions[
          cacheKeyGenStrategy || KeyGenStrategy.HASH
        ](keyGenArgs || [], args);
        // Look up or default the cache configuration.  Specified cache configuration will override the config looked up.
        const mergedCacheConfig = {
          ...cacheConfigLookupFunction(cacheRegionName),
          ...(cacheConfiguration || {}),
        };
        // Bind "this" to the callback
        const boundOriginalFunction = originalFunction.bind(this);

        try {
          logger.debug(
            `Attempting to read through cache in decorator for key ${cacheKey}`,
            { methodName }
          );
          return await withReadThroughCache(cache, {
            cacheRegion: cacheRegionName,
            cacheKey: cacheKey,
            fnInvocation: {
              readFn: boundOriginalFunction,
              args,
            },
            cacheConfig: mergedCacheConfig,
          })(...args);
        } catch (e) {
          throw new CacheError(
            `Error attempting to read through cache in decorator for key ${cacheKey}`,
            e
          );
        }
      };

      return propertyDesciptor;
    };
  };
}

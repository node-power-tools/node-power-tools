import { CacheCodec } from './cache'

const CACHE_REGION_PREFIX = 'CACHE_'

/**
 * A simple, naive codec for encoding/decoding objects to/from their serialized form.
 */
export const SimpleJsonCodec: CacheCodec = {
  encode: <T> (rawObject: T): string => {
    return JSON.stringify(rawObject)
  },
  decode: <T> (encodedObject: string): T => {
    return JSON.parse(encodedObject)
  }
}

/**
 * Unfortuntely the node-redis library provides no sugar for maintaining hash map TTLs so we can't use HSET with
 * TTL.  To work around this, build the cache key with a region prefix to namespace cache entries :/
 *
 * @param cacheRegion The region name for the cache
 * @param cacheKey The key for the cache entry
 * @return The composite cache key
 */
export const buildRegionPrefixedCacheKey = (cacheRegion: string, cacheKey: string): string => {
  return `${CACHE_REGION_PREFIX}${cacheRegion}::${cacheKey}`
}

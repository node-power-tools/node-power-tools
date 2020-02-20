import { CacheCodec } from './cache'

export const CACHE_REGION_PREFIX = 'CACHE_'
export const CACHE_KEY_DELIMITER = '::'
const REGION_NAME_REGEX = new RegExp(/^CACHE_(.*)::.*$/)
const KEY_REGEX = new RegExp(/^CACHE_.*::(.*)$/)

/**
 * A simple, naive codec for encoding/decoding objects to/from their serialized form.
 */
export const SimpleJsonCodec: CacheCodec = {
  encode: <T>(rawObject: T): string => {
    return JSON.stringify(rawObject)
  },
  decode: <T>(encodedObject: string): T => {
    return JSON.parse(encodedObject)
  }
}

/**
 * Build a cache key region prefix
 *
 * @param cacheRegion The cache region name
 * @return The prefix
 */
export const buildCacheKeyRegionPrefix = (cacheRegion: string): string => {
  return `${CACHE_REGION_PREFIX}${cacheRegion}${CACHE_KEY_DELIMITER}`
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
  return `${buildCacheKeyRegionPrefix(cacheRegion)}${cacheKey}`
}

const extractRegexGroup = (tested: string, regex: RegExp): string => {
  const matches = tested && regex.exec(tested)
  if (matches && matches.length === 2) {
    // First match is full match, second match is first capture group :/
    return matches[1]
  }
  return 'UNKNOWN'
}

/**
 * Extract the cache region name from a cache key
 *
 * @param cacheKey The key to operate on
 * @return The cache region name
 */
export const extractCacheRegionNameFromCacheKey = (cacheKey: string): string => {
  return extractRegexGroup(cacheKey, REGION_NAME_REGEX)
}

/**
 * Extract the cache key name from a region prefixed cache key
 *
 * @param cacheKey The key to operate on
 * @return The cache region name
 */
export const extractKeyFromRegionPrefixedCacheKey = (cacheKey: string): string => {
  return extractRegexGroup(cacheKey, KEY_REGEX)
}

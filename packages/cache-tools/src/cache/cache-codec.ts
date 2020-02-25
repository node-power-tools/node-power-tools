import { Optional } from '../util'
import { CodecRegistryError } from './errors'

export const CACHE_REGION_PREFIX = 'CACHE_'
export const CACHE_KEY_DELIMITER = '::'
export const CACHE_CODEC_DELIMITER = '@@'
const REGION_NAME_REGEX = new RegExp(/^CACHE_(.*)::.*$/)
const KEY_REGEX = new RegExp(/^CACHE_.*::(.*)$/)

/**
 * Cache serialization codec.
 *
 * Note that all codecs must be registered with CodecRegistry at runtime.
 */
export abstract class CacheCodec {
  /**
   * A unique identifier for this codec - must be unique across all codecs as
   * the id is serialized as part of the cached data to use for de-serialization
   */
  public abstract getId(): string;

  /**
   * Do the encoding for the raw object here
   *
   * @param rawObject The raw object
   */
  protected abstract encodeInternal<T>(rawObject: T): string;

  /**
   * Do the decoding from the encoded object here
   *
   * @param encodedObjectString The string representing the encoded object
   */
  protected abstract decodeInternal<T>(encodedObjectString: string): T;

  /**
   * Encode the raw object.  Prefix with the codec id
   *
   * @param rawObject The raw object to encode
   */
  public encode<T>(rawObject: T): string {
    return `${this.getId()}${CACHE_CODEC_DELIMITER}${this.encodeInternal(
      rawObject
    )}`
  }

  /**
   * Decode the encoded object using the codec indicated by the id in the
   * encodedObject string
   *
   * @param encodedObjectString The encoded object string
   */
  public static decode<T>(
    encodedObjectString: string | undefined | null
  ): Optional<T> {
    if (!encodedObjectString) {
      return undefined
    }
    const codecDelIdx = encodedObjectString.indexOf(CACHE_CODEC_DELIMITER)
    const codec = codecRegistry.getCodecInstance(
      encodedObjectString.substr(0, codecDelIdx)
    )
    const encodedObj = encodedObjectString.substr(
      codecDelIdx + CACHE_CODEC_DELIMITER.length
    )
    return codec.decodeInternal(encodedObj)
  }
}

export class CodecRegistry {
  private readonly codecByIdMap = new Map<string, CacheCodec>();
  private readonly codecByClassMap = new Map<any, CacheCodec>();

  /**
   * Register a cache codec
   *
   * @param codec The codec
   */
  public registerCodec(codec: CacheCodec): void {
    if (this.codecByIdMap.has(codec.getId())) {
      throw new CodecRegistryError(
        `CodecRegistry already has a codec registered with id ${codec.getId()}`
      )
    }
    this.codecByIdMap.set(codec.getId(), codec)
    this.codecByClassMap.set(typeof codec, codec)
  }

  public getCodecInstance(codecId: string): CacheCodec {
    const res = this.codecByIdMap.get(codecId)
    if (res == null) {
      throw new CodecRegistryError(
        `Codec with id ${codecId || 'EMPTY_CODEC_ID'} unknown to codec registry`
      )
    }
    return res
  }
}

/**
 * Global codec registry
 */
export const codecRegistry = new CodecRegistry()

/**
 * A simple, naive codec for encoding/decoding objects to/from their serialized form.
 */
export class SimpleJsonCodec extends CacheCodec {
  public static ID = 'sjc';

  getId(): string {
    return SimpleJsonCodec.ID
  }

  protected encodeInternal<T>(rawObject: T): string {
    return JSON.stringify(rawObject)
  }

  protected decodeInternal<T>(encodedObject: string): T {
    return JSON.parse(encodedObject)
  }
}
codecRegistry.registerCodec(new SimpleJsonCodec())

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
export const buildRegionPrefixedCacheKey = (
  cacheRegion: string,
  cacheKey: string
): string => {
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
export const extractCacheRegionNameFromCacheKey = (
  cacheKey: string
): string => {
  return extractRegexGroup(cacheKey, REGION_NAME_REGEX)
}

/**
 * Extract the cache key name from a region prefixed cache key
 *
 * @param cacheKey The key to operate on
 * @return The cache region name
 */
export const extractKeyFromRegionPrefixedCacheKey = (
  cacheKey: string
): string => {
  return extractRegexGroup(cacheKey, KEY_REGEX)
}

import { LockFactory } from '@node-power-tools/concurrent-tools';
import { NptLogger } from '@node-power-tools/logging-tools';
import { IHandyRedis } from 'handy-redis';
import { mock, mockClear } from 'jest-mock-extended';

import { DEFAULT_CACHE_CONFIGURATION } from '../cache';
import { buildRegionPrefixedCacheKey, SimpleJsonCodec } from '../cache-codec';
import { DEFAULT_CACHE_REGION_NAME, RedisCacheImpl } from './redis-cache';
import { buildPromise } from '@node-power-tools/test-utils';

const mockRedisClient = mock<IHandyRedis>();
const mockRedisLockFactory = mock<LockFactory>();
const mockLogger = mock<NptLogger>();

describe('redis-cache tests', () => {
  const tested = new RedisCacheImpl(
    mockRedisClient,
    mockRedisLockFactory,
    mockLogger
  );

  const region = 'someRegion';
  const key = 'someKey';
  const errorMsg = 'Boom goes the dynamite!';

  afterEach(() => {
    mockClear(mockRedisClient);
  });

  describe('mergeCacheConfigWithDefault', () => {
    it('empty partial', async () => {
      const config = {};

      const res = RedisCacheImpl.mergeCacheConfigWithDefault(config);

      expect(res).toStrictEqual(DEFAULT_CACHE_CONFIGURATION);
    });

    it('partial', async () => {
      const config = {
        ttlSeconds: 20,
        doubleCheckedPut: true,
        codecId: 'specialCodec',
      };

      const res = RedisCacheImpl.mergeCacheConfigWithDefault(config);

      expect(res.doubleCheckLockTtlSeconds).toStrictEqual(
        DEFAULT_CACHE_CONFIGURATION.doubleCheckLockTtlSeconds
      );
      expect(res.ttlSeconds).toStrictEqual(config.ttlSeconds);
      expect(res.doubleCheckedPut).toStrictEqual(config.doubleCheckedPut);
      expect(res.codecId).toStrictEqual(config.codecId);
    });
  });

  describe('get', () => {
    const expectedKey = buildRegionPrefixedCacheKey(region, key);
    const expectedDefaultRegionKey = buildRegionPrefixedCacheKey(
      DEFAULT_CACHE_REGION_NAME,
      key
    );
    const expected = { some: '1', object: '2' };
    const encodedRes = buildPromise(new SimpleJsonCodec().encode(expected));

    it('happy path no data cached', async () => {
      const res1 = await tested.get(key, region);

      expect(mockRedisClient.get).toHaveBeenCalledWith(expectedKey);
      expect(res1).toBeUndefined();
    });

    it('happy path data found', async () => {
      mockRedisClient.get.calledWith(expectedKey).mockReturnValue(encodedRes);

      const res2 = await tested.get(key, region);

      expect(mockRedisClient.get).toHaveBeenCalledWith(expectedKey);
      expect(res2).toEqual(expected);
    });

    it('happy path default region no cached value found', async () => {
      const res = await tested.get(key);

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        expectedDefaultRegionKey
      );
      expect(res).toBeUndefined();
    });

    it('happy path default region cached value found', async () => {
      mockRedisClient.get
        .calledWith(expectedDefaultRegionKey)
        .mockReturnValue(encodedRes);

      const res = await tested.get(key);

      expect(res).toEqual(expected);
    });

    it('error', async () => {
      mockRedisClient.get.mockImplementation(() => {
        throw new Error(errorMsg);
      });

      try {
        await tested.get(key, region);
        fail('Should not get here');
      } catch (e) {
        expect(e.message).toEqual(expect.stringContaining(errorMsg));
      }
    });
  });
});

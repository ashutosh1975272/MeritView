const CACHE_PREFIX = 'swr:';
const DEFAULT_STALE_TTL = 60 * 1000;
const DEFAULT_MAX_AGE = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleAt: number;
  expiresAt: number;
}

export class SWRCache {
  private static instance: SWRCache;
  private cache = new Map<string, CacheEntry<any>>();

  static getInstance(): SWRCache {
    if (!SWRCache.instance) {
      SWRCache.instance = new SWRCache();
    }
    return SWRCache.instance;
  }

  get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(CACHE_PREFIX + key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(CACHE_PREFIX + key);
      return null;
    }
    return {
      data: entry.data as T,
      isStale: Date.now() > entry.staleAt,
    };
  }

  set<T>(key: string, data: T, staleTtl = DEFAULT_STALE_TTL, maxAge = DEFAULT_MAX_AGE): void {
    const now = Date.now();
    this.cache.set(CACHE_PREFIX + key, {
      data,
      timestamp: now,
      staleAt: now + staleTtl,
      expiresAt: now + maxAge,
    });
  }

  async fetchWithSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { staleTtl?: number; maxAge?: number }
  ): Promise<{ data: T; fromCache: boolean; isStale: boolean }> {
    const cached = this.get<T>(key);

    if (cached && !cached.isStale) {
      return { data: cached.data, fromCache: true, isStale: false };
    }

    if (cached && cached.isStale) {
      this.fetchAndCache(key, fetcher(), options);
      return { data: cached.data, fromCache: true, isStale: true };
    }

    const promise = fetcher();
    this.fetchAndCache(key, promise, options);
    return { data: await promise, fromCache: false, isStale: false };
  }

  private async fetchAndCache<T>(
    key: string,
    promise: Promise<T>,
    options?: { staleTtl?: number; maxAge?: number }
  ): Promise<void> {
    try {
      const data = await promise;
      this.set(key, data, options?.staleTtl, options?.maxAge);
    } catch {
    }
  }

  invalidate(key: string): void {
    this.cache.delete(CACHE_PREFIX + key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const cacheKey of this.cache.keys()) {
      if (regex.test(cacheKey)) {
        this.cache.delete(cacheKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const swrCache = SWRCache.getInstance();

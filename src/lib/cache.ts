/**
 * Cache-Aside Pattern Implementation
 * Reduces database load and improves response times
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  defaultTTL: number;  // Time to live in milliseconds
  maxSize: number;     // Maximum number of entries
}

const defaultConfig: CacheConfig = {
  defaultTTL: 5 * 60 * 1000,  // 5 minutes
  maxSize: 100                // 100 entries max
};

/**
 * In-memory cache with TTL support
 */
export class Cache<T = any> {
  private store = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    
    // Periodic cleanup of expired entries
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Optional custom TTL in milliseconds
   */
  set(key: string, data: T, ttl?: number): void {
    // Enforce max size by removing oldest entry
    if (this.store.size >= this.config.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTTL
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }
}

/**
 * Cache-Aside wrapper for async operations
 */
export class CacheAside {
  private cache: Cache;

  constructor(cache?: Cache) {
    this.cache = cache ?? new Cache();
  }

  /**
   * Get from cache or fetch from source and cache the result
   * @param key - Cache key
   * @param fetchFn - Function to fetch data if not in cache
   * @param ttl - Optional custom TTL
   * @returns Cached or fetched data
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = this.cache.get(key) as T | null;
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    const data = await fetchFn();
    
    // Store in cache
    this.cache.set(key, data as any, ttl);
    
    return data;
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Get underlying cache instance
   */
  getCache(): Cache {
    return this.cache;
  }
}

// Singleton cache instances for different use cases
const quizCache = new Cache({ defaultTTL: 5 * 60 * 1000, maxSize: 50 });
const leaderboardCache = new Cache({ defaultTTL: 30 * 1000, maxSize: 100 });

export const quizCacheAside = new CacheAside(quizCache);
export const leaderboardCacheAside = new CacheAside(leaderboardCache);

/**
 * Create a cache key for quiz PIN
 */
export function getQuizCacheKey(pin: string): string {
  return `quiz:${pin}`;
}

/**
 * Create a cache key for leaderboard
 */
export function getLeaderboardCacheKey(pin: string): string {
  return `leaderboard:${pin}`;
}

/**
 * Invalidate quiz cache when quiz is modified/deleted
 */
export function invalidateQuizCache(pin: string): void {
  quizCacheAside.invalidate(getQuizCacheKey(pin));
}

/**
 * Invalidate leaderboard cache when new score is added
 */
export function invalidateLeaderboardCache(pin: string): void {
  leaderboardCacheAside.invalidate(getLeaderboardCacheKey(pin));
}

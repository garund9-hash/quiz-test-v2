/**
 * Cache-Aside Pattern Implementation
 * Reduces database load and improves response times with TTL-based caching
 */

// ============================================================================
// Time Constants (milliseconds)
// ============================================================================

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const CLEANUP_INTERVAL = ONE_MINUTE;

// ============================================================================
// Type Definitions
// ============================================================================

interface CacheEntry<T> {
  value: T;
  createdAt: number;
  timeToLive: number;
}

export interface CacheConfiguration {
  /** Default TTL in milliseconds */
  defaultTTL: number;
  /** Maximum number of entries */
  maxEntries: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: CacheConfiguration = {
  defaultTTL: 5 * ONE_MINUTE,
  maxEntries: 100
};

// ============================================================================
// Cache Class
// ============================================================================

/**
 * In-memory cache with TTL support and automatic cleanup
 */
export class Cache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly config: CacheConfiguration;

  constructor(config: Partial<CacheConfiguration> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startPeriodicCleanup();
  }

  /**
   * Retrieve value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Store value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional custom TTL in milliseconds
   */
  set(key: string, value: T, ttl?: number): void {
    this.enforceMaxSize();

    this.store.set(key, {
      value,
      createdAt: Date.now(),
      timeToLive: ttl ?? this.config.defaultTTL
    });
  }

  /**
   * Remove value from cache
   * @returns true if entry was removed
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
   * Get cache statistics
   */
  getStatistics(): { entryCount: number; keys: string[] } {
    return {
      entryCount: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private isExpired(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return now > entry.createdAt + entry.timeToLive;
  }

  private enforceMaxSize(): void {
    if (this.store.size >= this.config.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(() => this.cleanupExpiredEntries(), CLEANUP_INTERVAL);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.createdAt + entry.timeToLive) {
        this.store.delete(key);
      }
    }
  }
}

// ============================================================================
// Cache-Aside Wrapper
// ============================================================================

/**
 * Implements cache-aside pattern for async operations
 */
export class CacheAside {
  private readonly cache: Cache;

  constructor(cache?: Cache) {
    this.cache = cache ?? new Cache();
  }

  /**
   * Get from cache or fetch from source and cache the result
   * @param key - Cache key
   * @param fetchOperation - Async function to fetch data on cache miss
   * @param ttl - Optional custom TTL in milliseconds
   * @returns Cached or fetched data
   */
  async getOrFetch<T>(
    key: string,
    fetchOperation: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cachedValue = this.cache.get(key) as T | null;
    if (cachedValue !== null) {
      return cachedValue;
    }

    // Cache miss - fetch from source
    const value = await fetchOperation();

    // Store in cache
    this.cache.set(key, value as T, ttl);

    return value;
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

// ============================================================================
// Pre-configured Cache Instances
// ============================================================================

/** Cache for quiz data (5 minute TTL, 50 entries max) */
const quizCache = new Cache({ 
  defaultTTL: 5 * ONE_MINUTE, 
  maxEntries: 50 
});

/** Cache for leaderboard data (30 second TTL, 100 entries max) */
const leaderboardCache = new Cache({ 
  defaultTTL: 30 * ONE_SECOND, 
  maxEntries: 100 
});

/** Quiz cache-aside instance */
export const quizCacheAside = new CacheAside(quizCache);

/** Leaderboard cache-aside instance */
export const leaderboardCacheAside = new CacheAside(leaderboardCache);

// ============================================================================
// Cache Key Utilities
// ============================================================================

/**
 * Generate cache key for quiz data
 */
export function buildQuizCacheKey(pin: string): string {
  return `quiz:${pin}`;
}

/**
 * Generate cache key for leaderboard data
 */
export function buildLeaderboardCacheKey(pin: string): string {
  return `leaderboard:${pin}`;
}

// ============================================================================
// Cache Invalidation Helpers
// ============================================================================

/**
 * Invalidate quiz cache when quiz is modified or deleted
 */
export function invalidateQuizCache(pin: string): void {
  quizCacheAside.invalidate(buildQuizCacheKey(pin));
}

/**
 * Invalidate leaderboard cache when new score is added
 */
export function invalidateLeaderboardCache(pin: string): void {
  leaderboardCacheAside.invalidate(buildLeaderboardCacheKey(pin));
}

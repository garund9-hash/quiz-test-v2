/**
 * Token Bucket Rate Limiter
 * Prevents abuse and controls API costs by limiting request frequency
 */

interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

// In-memory storage for rate limits (per IP/user)
const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitConfig {
  maxTokens: number;      // Maximum tokens (burst capacity)
  refillRate: number;     // Time in ms to refill one token
  maxAge: number;         // Time in ms before record expires
}

// Default configurations for different use cases
export const RateLimitPresets = {
  // Strict: 3 requests per minute
  strict: { maxTokens: 3, refillRate: 20000, maxAge: 60000 } as RateLimitConfig,
  
  // Standard: 5 requests per minute  
  standard: { maxTokens: 5, refillRate: 12000, maxAge: 120000 } as RateLimitConfig,
  
  // Lenient: 10 requests per minute
  lenient: { maxTokens: 10, refillRate: 6000, maxAge: 300000 } as RateLimitConfig,
  
  // Quiz generation: 5 per hour (expensive AI operation)
  quizGeneration: { maxTokens: 5, refillRate: 720000, maxAge: 3600000 } as RateLimitConfig,
  
  // Quiz submission: 10 per minute
  quizSubmission: { maxTokens: 10, refillRate: 6000, maxAge: 120000 } as RateLimitConfig
};

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = RateLimitPresets.standard) {
    this.config = config;
  }

  /**
   * Attempt to consume a token
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @returns true if request is allowed, false if rate limited
   */
  consume(identifier: string): boolean {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    if (!record) {
      // First request - initialize with max tokens minus one
      rateLimitStore.set(identifier, {
        tokens: this.config.maxTokens - 1,
        lastRefill: now
      });
      return true;
    }

    // Refill tokens based on elapsed time
    const elapsed = now - record.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.config.refillRate);
    
    record.tokens = Math.min(
      this.config.maxTokens,
      record.tokens + tokensToAdd
    );
    record.lastRefill = now - (elapsed % this.config.refillRate);

    // Clean up old records
    if (now - record.lastRefill > this.config.maxAge) {
      rateLimitStore.delete(identifier);
      return this.consume(identifier);
    }

    // Check if we have tokens available
    if (record.tokens <= 0) {
      return false;
    }

    // Consume a token
    record.tokens--;
    return true;
  }

  /**
   * Check rate limit and throw error if exceeded
   * @param identifier - Unique identifier
   * @throws RateLimitError if rate limited
   */
  check(identifier: string): void {
    if (!this.consume(identifier)) {
      const record = rateLimitStore.get(identifier);
      const retryAfter = record 
        ? Math.ceil(this.config.refillRate / 1000)
        : 60;
      
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      );
    }
  }

  /**
   * Get remaining tokens for an identifier
   */
  getRemaining(identifier: string): number {
    const record = rateLimitStore.get(identifier);
    if (!record) return this.config.maxTokens;

    const now = Date.now();
    const elapsed = now - record.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.config.refillRate);
    
    return Math.min(
      this.config.maxTokens,
      record.tokens + tokensToAdd
    );
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    rateLimitStore.delete(identifier);
  }

  /**
   * Clear all rate limit records (useful for testing)
   */
  clear(): void {
    rateLimitStore.clear();
  }
}

/**
 * Create a rate limiter with the given preset
 */
export function createRateLimiter(preset: keyof typeof RateLimitPresets = 'standard'): RateLimiter {
  return new RateLimiter(RateLimitPresets[preset]);
}

/**
 * Simple rate limit check function for quick use
 */
export function checkRateLimit(
  identifier: string, 
  preset: keyof typeof RateLimitPresets = 'standard'
): void {
  const limiter = createRateLimiter(preset);
  limiter.check(identifier);
}

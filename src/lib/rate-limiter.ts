/**
 * Token Bucket Rate Limiter
 * Prevents abuse and controls API costs by limiting request frequency
 */

// ============================================================================
// Time Constants (milliseconds)
// ============================================================================

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;

// ============================================================================
// Type Definitions
// ============================================================================

interface RateLimitEntry {
  availableTokens: number;
  lastRefillTimestamp: number;
}

export interface RateLimitConfiguration {
  /** Maximum tokens (burst capacity) */
  maxTokens: number;
  /** Milliseconds to refill one token */
  millisecondsPerToken: number;
  /** Milliseconds before entry expires */
  entryMaxAge: number;
}

// ============================================================================
// Preset Configurations
// ============================================================================

export const RATE_LIMIT_PRESETS: Record<string, RateLimitConfiguration> = {
  /** Strict: 3 requests per minute */
  strict: { 
    maxTokens: 3, 
    millisecondsPerToken: 20 * ONE_SECOND, 
    entryMaxAge: ONE_MINUTE 
  },
  
  /** Standard: 5 requests per minute */
  standard: { 
    maxTokens: 5, 
    millisecondsPerToken: 12 * ONE_SECOND, 
    entryMaxAge: 2 * ONE_MINUTE 
  },
  
  /** Lenient: 10 requests per minute */
  lenient: { 
    maxTokens: 10, 
    millisecondsPerToken: 6 * ONE_SECOND, 
    entryMaxAge: 5 * ONE_MINUTE 
  },
  
  /** Quiz generation: 5 per hour (expensive AI operation) */
  quizGeneration: { 
    maxTokens: 5, 
    millisecondsPerToken: 12 * ONE_MINUTE, 
    entryMaxAge: ONE_MINUTE 
  },
  
  /** Quiz submission: 10 per minute */
  quizSubmission: { 
    maxTokens: 10, 
    millisecondsPerToken: 6 * ONE_SECOND, 
    entryMaxAge: 2 * ONE_MINUTE 
  }
};

// ============================================================================
// Error Classes
// ============================================================================

export class RateLimitExceededError extends Error {
  public readonly retryAfterSeconds: number;
  
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// ============================================================================
// Rate Limiter Class
// ============================================================================

/** In-memory storage for rate limit entries */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Token bucket rate limiter implementation
 */
export class RateLimiter {
  private readonly config: RateLimitConfiguration;

  constructor(config: RateLimitConfiguration = RATE_LIMIT_PRESETS.standard) {
    this.config = config;
  }

  /**
   * Attempt to consume a token
   * @param clientId - Unique identifier (IP, user ID, etc.)
   * @returns true if request is allowed, false if rate limited
   */
  tryConsume(clientId: string): boolean {
    const currentTimestamp = Date.now();
    const entry = rateLimitStore.get(clientId);

    if (!entry) {
      this.initializeEntry(clientId, currentTimestamp);
      return true;
    }

    this.refillTokens(entry, currentTimestamp);
    this.cleanupStaleEntry(clientId, entry, currentTimestamp);

    if (entry.availableTokens <= 0) {
      return false;
    }

    entry.availableTokens--;
    return true;
  }

  /**
   * Check rate limit and throw error if exceeded
   * @param clientId - Unique identifier
   * @throws RateLimitExceededError if rate limited
   */
  enforceLimit(clientId: string): void {
    if (!this.tryConsume(clientId)) {
      const entry = rateLimitStore.get(clientId);
      const retryAfterSeconds = this.calculateRetryAfterSeconds(entry);
      
      throw new RateLimitExceededError(
        `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
        retryAfterSeconds
      );
    }
  }

  /**
   * Get remaining tokens for a client
   */
  getRemainingTokens(clientId: string): number {
    const entry = rateLimitStore.get(clientId);
    if (!entry) return this.config.maxTokens;

    const currentTimestamp = Date.now();
    this.refillTokens(entry, currentTimestamp);
    return entry.availableTokens;
  }

  /**
   * Reset rate limit for a client
   */
  reset(clientId: string): void {
    rateLimitStore.delete(clientId);
  }

  /**
   * Clear all rate limit entries (useful for testing)
   */
  clearAll(): void {
    rateLimitStore.clear();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private initializeEntry(clientId: string, timestamp: number): void {
    rateLimitStore.set(clientId, {
      availableTokens: this.config.maxTokens - 1,
      lastRefillTimestamp: timestamp
    });
  }

  private refillTokens(entry: RateLimitEntry, currentTimestamp: number): void {
    const elapsed = currentTimestamp - entry.lastRefillTimestamp;
    const tokensToAdd = Math.floor(elapsed / this.config.millisecondsPerToken);
    
    entry.availableTokens = Math.min(
      this.config.maxTokens,
      entry.availableTokens + tokensToAdd
    );
    entry.lastRefillTimestamp = currentTimestamp - (elapsed % this.config.millisecondsPerToken);
  }

  private cleanupStaleEntry(
    clientId: string, 
    entry: RateLimitEntry, 
    currentTimestamp: number
  ): void {
    if (currentTimestamp - entry.lastRefillTimestamp > this.config.entryMaxAge) {
      rateLimitStore.delete(clientId);
      this.initializeEntry(clientId, currentTimestamp);
    }
  }

  private calculateRetryAfterSeconds(entry?: RateLimitEntry | null): number {
    if (!entry) return 60;
    return Math.ceil(this.config.millisecondsPerToken / ONE_SECOND);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a rate limiter with a preset configuration
 */
export function createRateLimiter(
  presetName: keyof typeof RATE_LIMIT_PRESETS = 'standard'
): RateLimiter {
  return new RateLimiter(RATE_LIMIT_PRESETS[presetName]);
}

/**
 * Quick rate limit check (throws on failure)
 */
export function enforceRateLimit(
  clientId: string,
  presetName: keyof typeof RATE_LIMIT_PRESETS = 'standard'
): void {
  const limiter = createRateLimiter(presetName);
  limiter.enforceLimit(clientId);
}

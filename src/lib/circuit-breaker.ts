/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures and provides graceful degradation for external services
 */

// ============================================================================
// Time Constants (milliseconds)
// ============================================================================

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;

// ============================================================================
// Type Definitions
// ============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfiguration {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Number of successes in HALF_OPEN to close circuit */
  successThreshold: number;
  /** Milliseconds before transitioning from OPEN to HALF_OPEN */
  openTimeout: number;
}

interface CircuitStatistics {
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTimestamp: number | null;
  lastStateChangeTimestamp: number;
  currentState: CircuitState;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: CircuitBreakerConfiguration = {
  failureThreshold: 5,
  successThreshold: 2,
  openTimeout: 30 * ONE_SECOND
};

// ============================================================================
// Error Classes
// ============================================================================

export class CircuitOpenError extends Error {
  public readonly circuitState: CircuitState;
  public readonly retryAfterMilliseconds: number;
  
  constructor(
    serviceName: string,
    state: CircuitState,
    retryAfterMilliseconds: number
  ) {
    super(`Circuit breaker is OPEN for ${serviceName}. Retry after ${retryAfterMilliseconds}ms.`);
    this.name = 'CircuitOpenError';
    this.circuitState = state;
    this.retryAfterMilliseconds = retryAfterMilliseconds;
  }
}

// ============================================================================
// Circuit Breaker Class
// ============================================================================

/**
 * Implements the circuit breaker pattern for fault tolerance
 */
export class CircuitBreaker {
  private readonly serviceName: string;
  private readonly config: CircuitBreakerConfiguration;
  private stats: CircuitStatistics;

  constructor(
    serviceName: string,
    config: Partial<CircuitBreakerConfiguration> = {}
  ) {
    this.serviceName = serviceName;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = this.initializeStats();
  }

  /**
   * Execute a function with circuit breaker protection
   * @param operation - Async function to execute
   * @throws CircuitOpenError if circuit is open
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.isExecutionAllowed()) {
      const retryAfter = this.getRetryAfterMilliseconds();
      throw new CircuitOpenError(this.serviceName, this.stats.currentState, retryAfter);
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Check if circuit allows execution
   */
  isExecutionAllowed(): boolean {
    const currentTimestamp = Date.now();

    switch (this.stats.currentState) {
      case 'CLOSED':
        return true;
        
      case 'OPEN':
        if (this.shouldTransitionToHalfOpen(currentTimestamp)) {
          this.transitionTo('HALF_OPEN');
          return true;
        }
        return false;
        
      case 'HALF_OPEN':
        return true;
        
      default:
        return true;
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.stats.consecutiveSuccesses++;
    this.stats.consecutiveFailures = 0;

    if (this.stats.currentState === 'HALF_OPEN' && 
        this.stats.consecutiveSuccesses >= this.config.successThreshold) {
      this.transitionTo('CLOSED');
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    this.stats.consecutiveFailures++;
    this.stats.lastFailureTimestamp = Date.now();

    if (this.stats.currentState === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (
      this.stats.currentState === 'CLOSED' &&
      this.stats.consecutiveFailures >= this.config.failureThreshold
    ) {
      this.transitionTo('OPEN');
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.stats.currentState;
  }

  /**
   * Get circuit statistics
   */
  getStatistics(): CircuitStatistics {
    return { ...this.stats };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Force circuit to open state
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
  }

  /**
   * Force circuit to closed state
   */
  forceClose(): void {
    this.transitionTo('CLOSED');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private initializeStats(): CircuitStatistics {
    return {
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureTimestamp: null,
      lastStateChangeTimestamp: Date.now(),
      currentState: 'CLOSED'
    };
  }

  private shouldTransitionToHalfOpen(currentTimestamp: number): boolean {
    const elapsed = currentTimestamp - this.stats.lastStateChangeTimestamp;
    return elapsed >= this.config.openTimeout;
  }

  private getRetryAfterMilliseconds(): number {
    if (this.stats.currentState !== 'OPEN') return 0;
    
    const elapsed = Date.now() - this.stats.lastStateChangeTimestamp;
    return Math.max(0, this.config.openTimeout - elapsed);
  }

  private transitionTo(newState: CircuitState): void {
    if (this.stats.currentState === newState) return;

    const previousState = this.stats.currentState;
    this.stats.currentState = newState;
    this.stats.lastStateChangeTimestamp = Date.now();
    this.resetCounters(newState);

    console.log(`[CircuitBreaker:${this.serviceName}] ${previousState} → ${newState}`);
  }

  private resetCounters(newState: CircuitState): void {
    if (newState === 'CLOSED') {
      this.stats.consecutiveFailures = 0;
      this.stats.consecutiveSuccesses = 0;
    } else if (newState === 'HALF_OPEN') {
      this.stats.consecutiveSuccesses = 0;
    }
  }
}

// ============================================================================
// Pre-configured Circuit Breakers
// ============================================================================

/** Circuit breaker for Gemini API calls */
export const geminiCircuitBreaker = new CircuitBreaker('Gemini API', {
  failureThreshold: 3,
  successThreshold: 2,
  openTimeout: ONE_MINUTE
});

/** Circuit breaker for Firebase operations */
export const firebaseCircuitBreaker = new CircuitBreaker('Firebase', {
  failureThreshold: 5,
  successThreshold: 2,
  openTimeout: 30 * ONE_SECOND
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Execute with fallback when circuit is open
 */
export async function executeWithFallback<T>(
  breaker: CircuitBreaker,
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T>
): Promise<T> {
  try {
    return await breaker.execute(primaryOperation);
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      console.warn(`[CircuitBreaker:${breaker}] Circuit open, using fallback`);
      return await fallbackOperation();
    }
    throw error;
  }
}

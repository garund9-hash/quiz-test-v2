/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures and provides graceful degradation
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;   // Number of failures before opening circuit
  successThreshold: number;   // Number of successes in half-open to close
  timeout: number;            // Time in ms before attempting reset (OPEN -> HALF_OPEN)
  monitoringPeriod: number;   // Time window for counting failures
}

const defaultConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,              // 30 seconds
  monitoringPeriod: 60000      // 1 minute
};

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly state: CircuitState,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  state: CircuitState;
}

/**
 * Circuit Breaker for external service calls
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private stats: CircuitStats;
  private readonly name: string;

  constructor(
    name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.name = name;
    this.config = { ...defaultConfig, ...config };
    this.stats = this.resetStats();
  }

  private resetStats(): CircuitStats {
    return {
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastStateChange: Date.now(),
      state: 'CLOSED'
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should allow the request
    if (!this.canExecute()) {
      const retryAfter = this.getRetryAfter();
      throw new CircuitBreakerError(
        `Circuit breaker is OPEN for ${this.name}. Retry after ${retryAfter}ms.`,
        this.stats.state,
        retryAfter
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if the circuit allows execution
   */
  private canExecute(): boolean {
    const now = Date.now();

    switch (this.stats.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if timeout has passed to transition to HALF_OPEN
        if (now - this.stats.lastStateChange >= this.config.timeout) {
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
   * Handle successful execution
   */
  private onSuccess(): void {
    this.stats.successes++;
    this.stats.failures = 0; // Reset failure count on success

    if (this.stats.state === 'HALF_OPEN') {
      if (this.stats.successes >= this.config.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.stats.failures++;
    this.stats.lastFailureTime = Date.now();

    if (this.stats.state === 'HALF_OPEN') {
      // Any failure in half-open immediately opens the circuit
      this.transitionTo('OPEN');
    } else if (
      this.stats.state === 'CLOSED' &&
      this.stats.failures >= this.config.failureThreshold
    ) {
      this.transitionTo('OPEN');
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.stats.state === newState) return;

    const oldState = this.stats.state;
    this.stats.state = newState;
    this.stats.lastStateChange = Date.now();

    // Reset counters on state transition
    if (newState === 'CLOSED') {
      this.stats.successes = 0;
      this.stats.failures = 0;
    } else if (newState === 'HALF_OPEN') {
      this.stats.successes = 0;
    }

    console.log(`[CircuitBreaker:${this.name}] ${oldState} -> ${newState}`);
  }

  /**
   * Get time until retry is allowed
   */
  private getRetryAfter(): number {
    if (this.stats.state !== 'OPEN') return 0;
    
    const elapsed = Date.now() - this.stats.lastStateChange;
    return Math.max(0, this.config.timeout - elapsed);
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.stats.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitStats {
    return { ...this.stats };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.stats = this.resetStats();
  }

  /**
   * Force open the circuit (for manual intervention)
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
  }

  /**
   * Force close the circuit (for manual intervention)
   */
  forceClose(): void {
    this.transitionTo('CLOSED');
  }
}

/**
 * Pre-configured circuit breakers for different services
 */

// Gemini API circuit breaker
export const geminiCircuitBreaker = new CircuitBreaker('Gemini API', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 60000,           // 1 minute timeout
  monitoringPeriod: 120000  // 2 minute monitoring window
});

// Firebase circuit breaker
export const firebaseCircuitBreaker = new CircuitBreaker('Firebase', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000,           // 30 seconds timeout
  monitoringPeriod: 60000   // 1 minute monitoring window
});

/**
 * Execute with fallback if circuit is open
 */
export async function executeWithFallback<T>(
  circuitBreaker: CircuitBreaker,
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>
): Promise<T> {
  try {
    return await circuitBreaker.execute(primaryFn);
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      console.warn(`[CircuitBreaker:${circuitBreaker}] Circuit open, using fallback`);
      return await fallbackFn();
    }
    throw error;
  }
}

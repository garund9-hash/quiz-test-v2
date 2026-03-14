/**
 * Quiz Expiration and TTL Management
 * Handles automatic quiz expiration and lifecycle tracking with security controls
 */

import { z } from 'zod';
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
  limit as queryLimit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { getQuizRepository } from './repositories/quiz-repository';
import { getScoreRepository } from './repositories/score-repository';
import { invalidateQuizCache, invalidateLeaderboardCache } from './cache';
import { createRateLimiter, RateLimitExceededError } from './rate-limiter';
import {
  logSecurityEvent,
  logUnauthorizedAccess,
  logRateLimitExceeded
} from './security-logger';

// ============================================================================
// Time Constants (milliseconds)
// ============================================================================

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

// ============================================================================
// Security Configuration
// ============================================================================

/** Grace period for expiration checks (prevents issues with clock skew) */
export const EXPIRATION_GRACE_PERIOD_MS = 5 * ONE_MINUTE;

/** Maximum cleanup batch size to prevent timeout */
const CLEANUP_BATCH_SIZE = 100;

// ============================================================================
// TTL Configuration
// ============================================================================

export const QUIZ_TTL_CONFIG = {
  /** Default quiz lifetime: 7 days */
  defaultTTL: 7 * ONE_DAY,
  /** Warning threshold: 1 day before expiration */
  warningThreshold: ONE_DAY,
  /** Maximum allowed TTL: 30 days */
  maxTTL: 30 * ONE_DAY,
  /** Minimum allowed TTL: 1 hour */
  minTTL: ONE_HOUR
} as const;

export interface QuizTTLConfig {
  ttl: number;
  autoExpire: boolean;
}

// ============================================================================
// Input Validation Schemas
// ============================================================================

const expireQuizSchema = z.object({
  quizId: z
    .string()
    .min(1, 'Quiz ID is required')
    .max(100, 'Quiz ID is too long'),
  pin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only digits'),
  userId: z
    .string()
    .min(1, 'User ID is required')
    .max(100, 'User ID is too long')
});

const cleanupQuizSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  batchSize: z.number().int().min(1).max(500).optional().default(CLEANUP_BATCH_SIZE)
});

// ============================================================================
// Expiration Calculation
// ============================================================================

/**
 * Calculate expiration date based on TTL
 * @param ttl - Custom TTL in milliseconds (uses default if not provided)
 */
export function calculateExpiryDate(ttl?: number): Date {
  const validTTL = clamp(
    ttl ?? QUIZ_TTL_CONFIG.defaultTTL,
    QUIZ_TTL_CONFIG.minTTL,
    QUIZ_TTL_CONFIG.maxTTL
  );

  return new Date(Date.now() + validTTL);
}

/**
 * Check if a quiz is expired
 * @param expiresAt - Expiration timestamp
 * @param options - Optional configuration
 */
export function isQuizExpired(
  expiresAt: Date | null,
  options: { strict?: boolean } = {}
): boolean {
  if (!expiresAt) return false;

  const now = Date.now();
  const expiryTime = expiresAt.getTime();

  // Apply grace period for non-strict checks (better UX)
  if (!options.strict) {
    return now > expiryTime + EXPIRATION_GRACE_PERIOD_MS;
  }

  // Strict check for security-critical operations
  return now > expiryTime;
}

// ============================================================================
// Time Remaining Calculations
// ============================================================================

export interface TimeRemaining {
  expired: boolean;
  milliseconds: number;
  hours: number;
  days: number;
}

/**
 * Get time remaining until expiration
 */
export function getTimeUntilExpiry(expiresAt: Date | null): TimeRemaining {
  if (!expiresAt) {
    return {
      expired: false,
      milliseconds: Infinity,
      hours: Infinity,
      days: Infinity
    };
  }

  const now = new Date();
  const expiry = new Date(expiresAt);
  const differenceMs = expiry.getTime() - now.getTime();

  return {
    expired: differenceMs <= 0,
    milliseconds: Math.max(0, differenceMs),
    hours: Math.floor(Math.max(0, differenceMs) / ONE_HOUR),
    days: Math.floor(Math.max(0, differenceMs) / ONE_DAY)
  };
}

/**
 * Format expiry time for human-readable display
 */
export function formatExpiryTime(expiresAt: Date | null): string {
  if (!expiresAt) return 'Never';

  const time = getTimeUntilExpiry(expiresAt);

  if (time.expired) return 'Expired';
  if (time.days >= 1) return formatDays(time.days);
  if (time.hours >= 1) return formatHours(time.hours);

  const minutes = Math.floor(time.milliseconds / ONE_MINUTE);
  return formatMinutes(minutes);
}

// ============================================================================
// Quiz Expiration Operations (With Security Controls)
// ============================================================================

export interface ExpireQuizOptions {
  userId: string;
  clientIp?: string;
  reason?: 'manual' | 'auto' | 'admin';
}

export interface ExpireQuizResult {
  success: boolean;
  error?: string;
  wasAlreadyExpired?: boolean;
}

/**
 * Expire a quiz with full security controls
 * - Input validation
 * - Rate limiting
 * - Authorization checks
 * - Secure audit logging
 */
export async function expireQuiz(
  quizId: string,
  pin: string,
  options: ExpireQuizOptions
): Promise<ExpireQuizResult> {
  const { userId, clientIp = 'unknown', reason = 'manual' } = options;

  try {
    // Step 1: Validate inputs
    const validation = expireQuizSchema.safeParse({ quizId, pin, userId });
    if (!validation.success) {
      await logSecurityEvent('invalid_request', {
        action: 'expire_quiz',
        userId,
        errors: validation.error.issues.map(e => e.message)
      });
      return { success: false, error: 'Invalid request parameters' };
    }

    // Step 2: Rate limiting (strict - only 3 per hour per user)
    const rateLimiter = createRateLimiter('quizGeneration');
    const rateLimitId = `expire:${userId}`;

    try {
      rateLimiter.enforceLimit(rateLimitId);
    } catch (error) {
      if (error instanceof RateLimitExceededError) {
        await logRateLimitExceeded('expire_quiz', userId, 3);
        return { success: false, error: 'Too many requests. Please try again later.' };
      }
      throw error;
    }

    // Step 3: Authorization check - verify quiz exists and get current status
    const quizRepository = getQuizRepository();
    const quizResult = await quizRepository.findByPin(pin);

    if (!quizResult.success || !quizResult.data) {
      await logUnauthorizedAccess('quiz', userId, 'quiz_not_found');
      return { success: false, error: 'Quiz not found' };
    }

    const quiz = quizResult.data;

    // Step 4: Check if already expired (not an error, just informational)
    const alreadyExpired = isQuizExpired(quiz.expiresAt, { strict: true });

    // Step 5: Authorization - In a real app, verify user owns this quiz
    // For now, we'll check if the user has the correct PIN (basic auth)
    const isAuthorized = await verifyQuizAccess(quizId, userId, pin);

    if (!isAuthorized) {
      await logUnauthorizedAccess('quiz', userId, 'invalid_pin');
      return { 
        success: false, 
        error: 'Unauthorized: Invalid credentials for this quiz' 
      };
    }

    // Step 6: Perform expiration
    const updateResult = await quizRepository.updateStatus(quizId, 'expired');
    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    // Step 7: Invalidate caches
    invalidateQuizCache(pin);
    invalidateLeaderboardCache(pin);

    // Step 8: Audit logging (without sensitive data)
    await logSecurityEvent('quiz_expired', {
      quizId,
      userId,
      reason,
      wasAlreadyExpired: alreadyExpired,
      topic: quiz.topic.substring(0, 50) // Truncate for privacy
    });

    return {
      success: true,
      wasAlreadyExpired: alreadyExpired
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logSecurityEvent('cleanup_failed', {
      action: 'expire_quiz',
      quizId,
      userId,
      error: errorMessage
    });

    return { success: false, error: 'Failed to expire quiz' };
  }
}

// ============================================================================
// Cleanup Operations
// ============================================================================

export interface CleanupOptions {
  dryRun?: boolean;
  batchSize?: number;
}

export interface CleanupResult {
  success: boolean;
  expiredCount: number;
  errors: string[];
}

/**
 * Clean up all expired quizzes
 * Implements actual cleanup with batch processing
 */
export async function cleanupExpiredQuizzes(
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const { dryRun = false, batchSize = CLEANUP_BATCH_SIZE } = options;

  const errors: string[] = [];
  let expiredCount = 0;

  try {
    // Validate options
    const validation = cleanupQuizSchema.safeParse(options);
    if (!validation.success) {
      errors.push('Invalid cleanup options');
      return { success: false, expiredCount: 0, errors };
    }

    const quizzesRef = collection(db, 'quizzes');
    const now = Timestamp.fromDate(new Date());

    // Query for expired quizzes that are still marked as active
    const q = query(
      quizzesRef,
      where('expiresAt', '<=', now),
      where('status', '==', 'active'),
      queryLimit(batchSize)
    );

    const snapshot = await getDocs(q);

    if (dryRun) {
      await logSecurityEvent('cleanup_dry_run', {
        count: snapshot.size,
        timestamp: Date.now()
      });
      return { success: true, expiredCount: snapshot.size, errors: [] };
    }

    if (snapshot.empty) {
      return { success: true, expiredCount: 0, errors: [] };
    }

    // Process in batch
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      batch.update(doc.ref, {
        status: 'expired',
        expiredAt: serverTimestamp()
      });
      batchCount++;
    }

    await batch.commit();
    expiredCount = batchCount;

    // Log successful cleanup
    await logSecurityEvent('cleanup_completed', {
      expiredCount,
      batchSize,
      timestamp: Date.now()
    });

    return { success: true, expiredCount, errors };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logSecurityEvent('cleanup_failed', {
      error: errorMessage,
      timestamp: Date.now()
    });

    errors.push(errorMessage);
    return { success: false, expiredCount: 0, errors };
  }
}

// ============================================================================
// Quiz Lifecycle Information
// ============================================================================

export type QuizLifecycleStatus = 'active' | 'expiring-soon' | 'expired';

export interface QuizLifecycleInfo {
  status: QuizLifecycleStatus;
  createdAt: Date | null;
  expiresAt: Date | null;
  timeRemaining: TimeRemaining;
  formattedExpiry: string;
}

/**
 * Get comprehensive quiz lifecycle information
 */
export function getQuizLifecycleInfo(
  createdAt: Date | null,
  expiresAt: Date | null
): QuizLifecycleInfo {
  const timeRemaining = getTimeUntilExpiry(expiresAt);
  const formattedExpiry = formatExpiryTime(expiresAt);
  const status = determineLifecycleStatus(timeRemaining);

  return {
    status,
    createdAt,
    expiresAt,
    timeRemaining,
    formattedExpiry
  };
}

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Verify user has access to the quiz
 * In production, implement proper ownership verification
 */
async function verifyQuizAccess(
  quizId: string,
  userId: string,
  pin: string
): Promise<boolean> {
  // TODO: Implement proper ownership verification based on your auth system
  // For now, we verify the PIN matches (basic check)
  // In production, this should check:
  // 1. Is user the quiz creator? OR
  // 2. Does user have explicit permission?

  const quizRepository = getQuizRepository();
  const result = await quizRepository.findByPin(pin);

  if (!result.success || !result.data) {
    return false;
  }

  // Basic PIN verification (replace with proper auth check)
  return result.data.id === quizId;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function formatDays(days: number): string {
  return `${days} day${days > 1 ? 's' : ''}`;
}

function formatHours(hours: number): string {
  return `${hours} hour${hours > 1 ? 's' : ''}`;
}

function formatMinutes(minutes: number): string {
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

function determineLifecycleStatus(time: TimeRemaining): QuizLifecycleStatus {
  if (time.expired) return 'expired';
  if (time.milliseconds < QUIZ_TTL_CONFIG.warningThreshold) return 'expiring-soon';
  return 'active';
}

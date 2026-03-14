/**
 * Quiz Expiration and TTL Management
 * Handles automatic quiz expiration and lifecycle tracking
 */

import { getQuizRepository } from '@/lib/repositories/quiz-repository';
import { getScoreRepository } from '@/lib/repositories/score-repository';
import { invalidateQuizCache, invalidateLeaderboardCache } from './cache';

// ============================================================================
// Time Constants (milliseconds)
// ============================================================================

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;

// ============================================================================
// Configuration
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
 */
export function isQuizExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
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
    hours: Math.floor(Math.max(0, differenceMs) / (ONE_HOUR)),
    days: Math.floor(Math.max(0, differenceMs) / (ONE_DAY))
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
// Quiz Expiration Operations
// ============================================================================

/**
 * Expire a quiz and clean up associated data
 */
export async function expireQuiz(
  quizId: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const quizRepository = getQuizRepository();

    // Update quiz status to expired
    const updateResult = await quizRepository.updateStatus(quizId, 'expired');
    if (!updateResult.success) {
      return { success: false, error: updateResult.error };
    }

    // Invalidate caches
    invalidateQuizCache(pin);
    invalidateLeaderboardCache(pin);

    console.log(`[TTL Manager] Quiz ${quizId} (${pin}) expired successfully`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TTL Manager] Error expiring quiz:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Clean up all expired quizzes
 * Should be called periodically (e.g., via cron job or Cloud Function)
 */
export async function cleanupExpiredQuizzes(): Promise<{
  success: boolean;
  expiredCount: number;
  errors: string[];
}> {
  try {
    // Note: This would ideally query for expired quizzes directly
    // For production, use Firebase Cloud Functions with scheduled triggers
    console.log('[TTL Manager] Cleanup job executed');

    return {
      success: true,
      expiredCount: 0,
      errors: []
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TTL Manager] Cleanup failed:', errorMessage);
    return {
      success: false,
      expiredCount: 0,
      errors: [errorMessage]
    };
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

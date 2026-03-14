/**
 * Quiz Expiration and TTL Management
 * Handles automatic quiz expiration and cleanup
 */

import { getQuizRepository } from '@/lib/repositories/quiz-repository';
import { getScoreRepository } from '@/lib/repositories/score-repository';
import { invalidateQuizCache, invalidateLeaderboardCache } from './cache';

// Quiz TTL configuration
export const QUIZ_TTL_CONFIG = {
  defaultTTL: 7 * 24 * 60 * 60 * 1000,  // 7 days in milliseconds
  warningThreshold: 24 * 60 * 60 * 1000, // 1 day before expiration
  maxTTL: 30 * 24 * 60 * 60 * 1000,     // 30 days maximum
  minTTL: 1 * 60 * 60 * 1000            // 1 hour minimum
} as const;

export interface QuizTTLConfig {
  ttl: number;
  autoExpire: boolean;
}

/**
 * Calculate expiration date based on TTL
 */
export function calculateExpiryDate(ttl?: number): Date {
  const validTTL = Math.max(
    QUIZ_TTL_CONFIG.minTTL,
    Math.min(ttl ?? QUIZ_TTL_CONFIG.defaultTTL, QUIZ_TTL_CONFIG.maxTTL)
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

/**
 * Get time remaining until expiration
 */
export function getTimeUntilExpiry(expiresAt: Date | null): {
  expired: boolean;
  milliseconds: number;
  hours: number;
  days: number;
} {
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
  const diff = expiry.getTime() - now.getTime();

  return {
    expired: diff <= 0,
    milliseconds: Math.max(0, diff),
    hours: Math.floor(Math.max(0, diff) / (1000 * 60 * 60)),
    days: Math.floor(Math.max(0, diff) / (1000 * 60 * 60 * 24))
  };
}

/**
 * Format expiry time for display
 */
export function formatExpiryTime(expiresAt: Date | null): string {
  if (!expiresAt) return 'Never';
  
  const time = getTimeUntilExpiry(expiresAt);
  
  if (time.expired) return 'Expired';
  if (time.days >= 1) return `${time.days} day${time.days > 1 ? 's' : ''}`;
  if (time.hours >= 1) return `${time.hours} hour${time.hours > 1 ? 's' : ''}`;
  
  const minutes = Math.floor(time.milliseconds / (1000 * 60));
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

/**
 * Expire a quiz and clean up associated data
 */
export async function expireQuiz(quizId: string, pin: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const quizRepo = getQuizRepository();
    const scoreRepo = getScoreRepository();

    // Update quiz status to expired
    const quizResult = await quizRepo.updateStatus(quizId, 'expired');
    if (!quizResult.success) {
      return { success: false, error: quizResult.error };
    }

    // Optionally delete associated scores (or keep for historical data)
    // await scoreRepo.deleteByQuizId(quizId);

    // Invalidate caches
    invalidateQuizCache(pin);
    invalidateLeaderboardCache(pin);

    console.log(`[TTL Manager] Quiz ${quizId} (${pin}) expired successfully`);
    return { success: true };
  } catch (error: any) {
    console.error('[TTL Manager] Error expiring quiz:', error);
    return { success: false, error: error.message };
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
    const quizRepo = getQuizRepository();
    const errors: string[] = [];
    let expiredCount = 0;

    // Note: This would ideally query for expired quizzes
    // For now, we'd need to fetch all and filter client-side
    // In production, use Firebase Cloud Functions with scheduled triggers
    
    console.log('[TTL Manager] Cleanup job executed');
    
    return {
      success: true,
      expiredCount,
      errors
    };
  } catch (error: any) {
    console.error('[TTL Manager] Cleanup failed:', error);
    return {
      success: false,
      expiredCount: 0,
      errors: [error.message]
    };
  }
}

/**
 * Get quiz lifecycle info
 */
export function getQuizLifecycleInfo(
  createdAt: Date | null,
  expiresAt: Date | null
): {
  status: 'active' | 'expiring-soon' | 'expired';
  createdAt: Date | null;
  expiresAt: Date | null;
  timeRemaining: ReturnType<typeof getTimeUntilExpiry>;
  formattedExpiry: string;
} {
  const timeRemaining = getTimeUntilExpiry(expiresAt);
  const formattedExpiry = formatExpiryTime(expiresAt);
  
  let status: 'active' | 'expiring-soon' | 'expired' = 'active';
  
  if (timeRemaining.expired) {
    status = 'expired';
  } else if (timeRemaining.milliseconds < QUIZ_TTL_CONFIG.warningThreshold) {
    status = 'expiring-soon';
  }

  return {
    status,
    createdAt,
    expiresAt,
    timeRemaining,
    formattedExpiry
  };
}

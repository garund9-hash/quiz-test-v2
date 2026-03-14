'use server'

import { getQuizRepository } from '@/lib/repositories/quiz-repository';
import { getScoreRepository } from '@/lib/repositories/score-repository';
import { validateJoinQuiz, validateSubmitQuiz } from '@/lib/validators';
import { quizCacheAside, getQuizCacheKey, invalidateLeaderboardCache } from '@/lib/cache';
import { firebaseCircuitBreaker, CircuitBreakerError } from '@/lib/circuit-breaker';
import { createRateLimiter, RateLimitError } from '@/lib/rate-limiter';
import { isQuizExpired, getQuizLifecycleInfo } from '@/lib/ttl-manager';
import { headers } from 'next/headers';

/**
 * Get a quiz by PIN (client-safe version without answers)
 * Implements: validation, caching, circuit breaker
 */
export async function getClientQuiz(pin: string) {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] || 'unknown';

  try {
    // 1. Validate PIN format
    const validation = validateJoinQuiz({ pin, nickname: 'temp' });
    if (!validation.success) {
      // Find the pin-specific error
      const pinError = validation.error.issues.find((e: any) => e.path[0] === 'pin');
      if (pinError) {
        return { success: false, error: pinError.message };
      }
    }

    // 2. Check rate limit
    const rateLimiter = createRateLimiter('standard');
    try {
      rateLimiter.check(ip);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return { success: false, error: error.message };
      }
      throw error;
    }

    // 3. Try cache first (Cache-Aside pattern)
    const cacheKey = getQuizCacheKey(pin);
    const cachedQuiz = await quizCacheAside.getOrFetch(
      cacheKey,
      async () => {
        // Cache miss - fetch from database via repository
        const quizRepo = getQuizRepository();
        
        return await firebaseCircuitBreaker.execute(async () => {
          const result = await quizRepo.findActiveByPin(pin);
          
          if (!result.success) {
            throw new Error(result.error);
          }
          
          return result.data;
        });
      },
      5 * 60 * 1000 // 5 minute TTL
    );

    if (!cachedQuiz) {
      return { success: false, error: 'Quiz not found or not active' };
    }

    // 4. Check if quiz is expired
    const lifecycleInfo = getQuizLifecycleInfo(
      cachedQuiz.createdAt,
      cachedQuiz.expiresAt
    );

    if (lifecycleInfo.status === 'expired') {
      // Remove from cache
      quizCacheAside.invalidate(cacheKey);
      return { success: false, error: 'This quiz has expired' };
    }

    // 5. Return client-safe data
    return {
      success: true,
      topic: cachedQuiz.topic,
      clientQuestions: cachedQuiz.clientQuestions,
      lifecycleInfo
    };

  } catch (error: any) {
    console.error('[Grade Action] Error getting quiz:', error);
    
    if (error instanceof CircuitBreakerError) {
      return { 
        success: false, 
        error: 'Service temporarily unavailable. Please try again.' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    };
  }
}

/**
 * Submit quiz answers and get score
 * Implements: validation, rate limiting, server-side grading
 */
export async function submitQuizAnswers(
  pin: string,
  nickname: string,
  answers: number[]
) {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] || 'unknown';

  try {
    // 1. Validate all inputs
    const validation = validateSubmitQuiz({ pin, nickname, answers });
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`
      };
    }

    const { pin: validatedPin, nickname: validatedNickname, answers: validatedAnswers } = validation.data;

    // 2. Check rate limit (more lenient for submissions)
    const rateLimiter = createRateLimiter('quizSubmission');
    try {
      rateLimiter.check(ip);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return { success: false, error: error.message };
      }
      throw error;
    }

    // 3. Fetch quiz from database (with circuit breaker protection)
    const quizRepo = getQuizRepository();
    const quizResult = await firebaseCircuitBreaker.execute(async () => {
      return await quizRepo.findByPin(validatedPin);
    });

    if (!quizResult.success || !quizResult.data) {
      return { success: false, error: 'Quiz not found' };
    }

    const quiz = quizResult.data;

    // 4. Check if quiz is expired
    if (isQuizExpired(quiz.expiresAt)) {
      return { success: false, error: 'This quiz has expired' };
    }

    // 5. Server-side grading (answers never sent to client)
    let score = 0;
    const total = quiz.questions.length;

    validatedAnswers.forEach((ans, index) => {
      // Allow for 0 score if unanswered (ans === -1)
      if (ans !== -1 && index < total) {
        const correctAnswer = quiz.questions[index].correctAnswer;
        if (Number(correctAnswer) === Number(ans)) {
          score += 1;
        }
      }
    });

    const scorePercentage = Math.round((score / total) * 100);

    // 6. Save score to leaderboard via repository
    const scoreRepo = getScoreRepository();
    const saveResult = await scoreRepo.createScore({
      quizId: quiz.id!,
      pin: validatedPin,
      nickname: validatedNickname,
      score,
      total,
      scorePercentage,
      submittedAt: new Date()
    });

    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }

    // 7. Invalidate leaderboard cache to force refresh
    invalidateLeaderboardCache(validatedPin);

    return {
      success: true,
      score,
      total,
      scorePercentage
    };

  } catch (error: any) {
    console.error('[Grade Action] Error submitting quiz:', error);
    
    if (error instanceof CircuitBreakerError) {
      return { 
        success: false, 
        error: 'Service temporarily unavailable. Please try again.' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    };
  }
}

/**
 * Get leaderboard entries for a quiz PIN
 * Used by the client-side real-time subscription
 */
export async function getLeaderboard(pin: string) {
  try {
    const validation = validateJoinQuiz({ pin, nickname: 'temp' });
    if (!validation.success) {
      const pinError = validation.error.issues.find((e: any) => e.path[0] === 'pin');
      if (pinError) {
        return { success: false, error: pinError.message };
      }
    }

    const scoreRepo = getScoreRepository();
    const result = await scoreRepo.findByPin(pin);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: result.data
    };

  } catch (error: any) {
    console.error('[Grade Action] Error getting leaderboard:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch leaderboard' 
    };
  }
}

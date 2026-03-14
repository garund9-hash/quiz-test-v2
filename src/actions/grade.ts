'use server'

import { getQuizRepository } from '@/lib/repositories/quiz-repository';
import { getScoreRepository } from '@/lib/repositories/score-repository';
import { validateJoinQuiz, validateQuizSubmission } from '@/lib/validators';
import { quizCacheAside, buildQuizCacheKey, invalidateLeaderboardCache } from '@/lib/cache';
import { firebaseCircuitBreaker, CircuitOpenError } from '@/lib/circuit-breaker';
import { createRateLimiter, RateLimitExceededError } from '@/lib/rate-limiter';
import { isQuizExpired, getQuizLifecycleInfo } from '@/lib/ttl-manager';
import { headers } from 'next/headers';
import { Quiz, Question, OperationResult } from '@/lib/types';

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Types
// ============================================================================

interface QuizSessionData {
  topic: string;
  clientQuestions: Array<{ id: number; question: string; options: string[] }>;
  lifecycleInfo: {
    status: string;
    createdAt: Date | null;
    expiresAt: Date | null;
    timeRemaining: { expired: boolean; milliseconds: number; hours: number; days: number };
    formattedExpiry: string;
  };
}

interface ScoreSubmissionResult {
  score: number;
  total: number;
  scorePercentage: number;
}

// ============================================================================
// Public Server Actions
// ============================================================================

/**
 * Get a quiz by PIN (client-safe version without answers)
 */
export async function getClientQuiz(pin: string): Promise<OperationResult<QuizSessionData>> {
  const clientIp = await getClientIp();

  try {
    // Step 1: Validate PIN format
    const pinValidation = validatePinFormat(pin);
    if (!pinValidation.success) {
      return { success: false, error: pinValidation.error };
    }

    // Step 2: Check rate limit
    const rateLimitResult = checkStandardRateLimit(clientIp);
    if (!rateLimitResult.success) {
      return { success: false, error: rateLimitResult.error };
    }

    // Step 3: Fetch quiz (with caching)
    const quizResult = await fetchQuizWithCache(pin);
    if (!quizResult.success || !quizResult.data) {
      return { success: false, error: quizResult.error || 'Quiz not found' };
    }

    const quiz = quizResult.data;

    // Step 4: Check expiration
    if (isQuizExpired(quiz.expiresAt)) {
      invalidateQuizCache(pin);
      return { success: false, error: 'This quiz has expired' };
    }

    // Step 5: Return client-safe data
    return {
      success: true,
      data: {
        topic: quiz.topic,
        clientQuestions: quiz.clientQuestions,
        lifecycleInfo: getQuizLifecycleInfo(
          quiz.createdAt,
          quiz.expiresAt
        )
      }
    };

  } catch (error: unknown) {
    return handleServiceError(error);
  }
}

/**
 * Submit quiz answers and get score
 */
export async function submitQuizAnswers(
  pin: string,
  nickname: string,
  answers: number[]
): Promise<OperationResult<ScoreSubmissionResult>> {
  const clientIp = await getClientIp();

  try {
    // Step 1: Validate all inputs
    const inputValidation = validateQuizInput(pin, nickname, answers);
    if (!inputValidation.success || !inputValidation.data) {
      return { success: false, error: inputValidation.error || 'Invalid input' };
    }

    const { pin: validatedPin, nickname: validatedNickname, answers: validatedAnswers } = inputValidation.data;

    // Step 2: Check rate limit
    const rateLimitResult = checkSubmissionRateLimit(clientIp);
    if (!rateLimitResult.success) {
      return { success: false, error: rateLimitResult.error };
    }

    // Step 3: Fetch quiz from database
    const quizResult = await fetchQuiz(validatedPin);
    if (!quizResult.success || !quizResult.data) {
      return { success: false, error: quizResult.error || 'Quiz not found' };
    }

    const quiz = quizResult.data;

    // Step 4: Check expiration
    if (isQuizExpired(quiz.expiresAt)) {
      return { success: false, error: 'This quiz has expired' };
    }

    // Step 5: Grade quiz (server-side)
    const score = calculateScore(validatedAnswers, quiz.questions);

    // Step 6: Save score to leaderboard
    const saveResult = await saveScore({
      quizId: quiz.id!,
      pin: validatedPin,
      nickname: validatedNickname,
      score,
      total: quiz.questions.length
    });

    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }

    // Step 7: Invalidate leaderboard cache
    invalidateLeaderboardCache(validatedPin);

    return {
      success: true,
      data: {
        score,
        total: quiz.questions.length,
        scorePercentage: Math.round((score / quiz.questions.length) * 100)
      }
    };

  } catch (error: unknown) {
    return handleServiceError(error);
  }
}

/**
 * Get leaderboard entries for a quiz PIN
 */
export async function getLeaderboard(pin: string) {
  try {
    const pinValidation = validatePinFormat(pin);
    if (!pinValidation.success) {
      return { success: false, error: pinValidation.error };
    }

    const scoreRepository = getScoreRepository();
    const result = await scoreRepository.findByPin(pin);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch leaderboard';
    console.error('[Leaderboard] Error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// Private Helper Functions - Validation
// ============================================================================

function validatePinFormat(pin: string): OperationResult<never> {
  const validation = validateJoinQuiz({ pin, nickname: 'temp' });
  
  if (!validation.success) {
    const pinError = validation.error.issues.find((issue) => 
      String(issue.path[0]) === 'pin'
    );
    if (pinError) {
      return { success: false, error: pinError.message };
    }
  }
  
  return { success: true, data: undefined as never };
}

function validateQuizInput(
  pin: string,
  nickname: string,
  answers: number[]
): OperationResult<{ pin: string; nickname: string; answers: number[] }> {
  const validation = validateQuizSubmission({ pin, nickname, answers });
  
  if (!validation.success) {
    const firstError = validation.error.issues[0];
    return { 
      success: false,
      error: `${firstError.path.join('.')}: ${firstError.message}`
    };
  }

  return { success: true, data: validation.data };
}

// ============================================================================
// Private Helper Functions - Rate Limiting
// ============================================================================

function checkStandardRateLimit(clientIp: string): OperationResult<never> {
  const rateLimiter = createRateLimiter('standard');
  
  try {
    rateLimiter.enforceLimit(clientIp);
    return { success: true, data: undefined as never };
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}

function checkSubmissionRateLimit(clientIp: string): OperationResult<never> {
  const rateLimiter = createRateLimiter('quizSubmission');
  
  try {
    rateLimiter.enforceLimit(clientIp);
    return { success: true, data: undefined as never };
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}

// ============================================================================
// Private Helper Functions - Data Access
// ============================================================================

async function fetchQuizWithCache(pin: string): Promise<OperationResult<Quiz>> {
  const cacheKey = buildQuizCacheKey(pin);

  try {
    const quiz = await quizCacheAside.getOrFetch(
      cacheKey,
      async () => await fetchQuizFromDatabase(pin),
      CACHE_TTL_MS
    );

    return { success: true, data: quiz };
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      return { success: false, error: 'Service temporarily unavailable. Please try again.' };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch quiz' };
  }
}

async function fetchQuiz(pin: string): Promise<OperationResult<Quiz>> {
  try {
    return await firebaseCircuitBreaker.execute(async () => {
      const quizRepository = getQuizRepository();
      return await quizRepository.findByPin(pin);
    });
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      return { success: false, error: 'Service temporarily unavailable. Please try again.' };
    }
    throw error;
  }
}

async function fetchQuizFromDatabase(pin: string): Promise<Quiz> {
  const quizRepository = getQuizRepository();
  const result = await quizRepository.findActiveByPin(pin);

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.data!;
}

// ============================================================================
// Private Helper Functions - Grading
// ============================================================================

function calculateScore(answers: number[], questions: Question[]): number {
  let score = 0;

  answers.forEach((answer, index) => {
    if (answer !== -1 && index < questions.length) {
      const correctAnswer = questions[index].correctAnswer;
      if (Number(correctAnswer) === Number(answer)) {
        score += 1;
      }
    }
  });

  return score;
}

async function saveScore(scoreData: {
  quizId: string;
  pin: string;
  nickname: string;
  score: number;
  total: number;
}): Promise<OperationResult<string>> {
  const scoreRepository = getScoreRepository();
  
  return await scoreRepository.createScore({
    quizId: scoreData.quizId,
    pin: scoreData.pin,
    nickname: scoreData.nickname,
    score: scoreData.score,
    total: scoreData.total,
    scorePercentage: Math.round((scoreData.score / scoreData.total) * 100),
    submittedAt: new Date()
  });
}

// ============================================================================
// Private Helper Functions - Utilities
// ============================================================================

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
}

function handleServiceError(error: unknown): OperationResult<never> {
  if (error instanceof CircuitOpenError) {
    return { success: false, error: 'Service temporarily unavailable. Please try again.' };
  }

  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  console.error('[Grade Action] Error:', errorMessage);
  return { success: false, error: errorMessage };
}

function invalidateQuizCache(pin: string): void {
  quizCacheAside.invalidate(buildQuizCacheKey(pin));
}

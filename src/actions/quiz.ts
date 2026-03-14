'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getQuizRepository } from '@/lib/repositories/quiz-repository';
import { validateTopic } from '@/lib/validators';
import { generateUniquePin } from '@/lib/pin-generator';
import { calculateExpiryDate } from '@/lib/ttl-manager';
import { geminiCircuitBreaker, CircuitOpenError } from '@/lib/circuit-breaker';
import { createRateLimiter, RateLimitExceededError } from '@/lib/rate-limiter';
import { Question, ClientQuestion, OperationResult } from '@/lib/types';
import { headers } from 'next/headers';

// ============================================================================
// Configuration
// ============================================================================

const GEMINI_MODEL = 'gemini-2.5-flash';
const QUIZ_QUESTION_COUNT = 5;
const QUIZ_OPTION_COUNT = 4;

// ============================================================================
// Types
// ============================================================================

interface QuizGenerationData {
  pin: string;
  id: string;
}

// ============================================================================
// Public Server Actions
// ============================================================================

/**
 * Generate a new quiz on the given topic
 * Implements: validation, rate limiting, circuit breaker, unique PIN generation
 */
export async function generateQuiz(topic: string): Promise<OperationResult<QuizGenerationData>> {
  const clientIp = await getClientIp();

  try {
    // Step 1: Validate input
    const validatedTopic = validateTopicInput(topic);
    if (!validatedTopic.success || !validatedTopic.data) {
      return { success: false, error: validatedTopic.error || 'Invalid topic' };
    }

    // Step 2: Check rate limit
    const rateLimitResult = checkGenerationRateLimit(clientIp);
    if (!rateLimitResult.success) {
      return { success: false, error: rateLimitResult.error };
    }

    // Step 3: Generate quiz content with AI
    const questionsResult = await generateQuizQuestions(validatedTopic.data);
    if (!questionsResult.success || !questionsResult.data) {
      return { success: false, error: questionsResult.error || 'Failed to generate questions' };
    }

    // Step 4: Create client-safe questions and generate PIN
    const { questions } = questionsResult.data;
    const clientQuestions = createClientQuestions(questions);
    const pin = await generateUniquePin(4);
    const expiresAt = calculateExpiryDate();

    // Step 5: Store in Firestore
    return await storeQuiz({
      pin,
      topic: validatedTopic.data,
      questions,
      clientQuestions,
      expiresAt
    });

  } catch (error: unknown) {
    return handleUnexpectedError(error, 'generating quiz');
  }
}

// ============================================================================
// Private Helper Functions - Validation
// ============================================================================

function validateTopicInput(topic: string): OperationResult<string> {
  const validation = validateTopic(topic);
  
  if (!validation.success) {
    return { 
      success: false, 
      error: validation.error.issues[0].message 
    };
  }

  return { success: true, data: validation.data.topic };
}

function checkGenerationRateLimit(clientIp: string): OperationResult<never> {
  const rateLimiter = createRateLimiter('quizGeneration');
  
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
// Private Helper Functions - AI Generation
// ============================================================================

async function generateQuizQuestions(
  topic: string
): Promise<OperationResult<{ questions: Question[] }>> {
  try {
    const questions = await geminiCircuitBreaker.execute(async () => {
      return await fetchQuizContentFromAI(topic);
    });

    return { success: true, data: { questions } };
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      return { 
        success: false, 
        error: 'AI service temporarily unavailable. Please try again in a moment.' 
      };
    }
    return handleUnexpectedError(error, 'generating quiz content');
  }
}

async function fetchQuizContentFromAI(topic: string): Promise<Question[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = buildQuizPrompt(topic);
  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  const questions = parseQuizResponse(responseText);
  validateQuizStructure(questions);

  return questions;
}

function buildQuizPrompt(topic: string): string {
  return `Generate a 4-multiple-choice educational quiz about "${topic}".
Provide exactly ${QUIZ_QUESTION_COUNT} questions.
Return strictly a JSON array of objects without any markdown formatting.
Each object must have:
"question": the question text (string),
"options": an array of exactly ${QUIZ_OPTION_COUNT} strings,
"correctAnswer": an integer (0-3) representing the index of the correct option.`;
}

function parseQuizResponse(responseText: string): Question[] {
  const jsonString = responseText.replace(/```(?:json)?|```/g, '').trim();
  return JSON.parse(jsonString) as Question[];
}

function validateQuizStructure(questions: Question[]): void {
  if (!Array.isArray(questions)) {
    throw new Error('Invalid quiz format: expected an array');
  }

  if (questions.length !== QUIZ_QUESTION_COUNT) {
    throw new Error(`Invalid quiz format: expected ${QUIZ_QUESTION_COUNT} questions, got ${questions.length}`);
  }

  for (const question of questions) {
    validateQuestionStructure(question);
  }
}

function validateQuestionStructure(question: Question): void {
  if (!question.question) {
    throw new Error('Invalid question: missing question text');
  }

  if (!Array.isArray(question.options) || question.options.length !== QUIZ_OPTION_COUNT) {
    throw new Error('Invalid question: expected 4 options');
  }

  if (typeof question.correctAnswer !== 'number' || 
      question.correctAnswer < 0 || 
      question.correctAnswer >= QUIZ_OPTION_COUNT) {
    throw new Error('Invalid question: correctAnswer must be 0-3');
  }
}

// ============================================================================
// Private Helper Functions - Data Transformation
// ============================================================================

function createClientQuestions(questions: Question[]): ClientQuestion[] {
  return questions.map((question, index) => ({
    id: index,
    question: question.question,
    options: question.options
  }));
}

// ============================================================================
// Private Helper Functions - Storage
// ============================================================================

async function storeQuiz(quizData: {
  pin: string;
  topic: string;
  questions: Question[];
  clientQuestions: ClientQuestion[];
  expiresAt: Date;
}): Promise<OperationResult<QuizGenerationData>> {
  const quizRepository = getQuizRepository();

  const result = await quizRepository.createQuiz({
    pin: quizData.pin,
    topic: quizData.topic,
    questions: quizData.questions,
    clientQuestions: quizData.clientQuestions,
    createdAt: new Date(),
    expiresAt: quizData.expiresAt,
    status: 'active'
  });

  if (!result.success || !result.data) {
    return { success: false, error: result.error || 'Failed to store quiz' };
  }

  return {
    success: true,
    data: { pin: quizData.pin, id: result.data }
  };
}

// ============================================================================
// Private Helper Functions - Utilities
// ============================================================================

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
}

function handleUnexpectedError(
  error: unknown, 
  operation: string
): OperationResult<never> {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  console.error(`Error ${operation}:`, errorMessage);
  return { success: false, error: errorMessage };
}

'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getQuizRepository } from '@/lib/repositories/quiz-repository';
import { validateTopic } from '@/lib/validators';
import { generateUniquePin } from '@/lib/pin-generator';
import { calculateExpiryDate } from '@/lib/ttl-manager';
import { geminiCircuitBreaker, CircuitBreakerError } from '@/lib/circuit-breaker';
import { createRateLimiter, RateLimitPresets, RateLimitError } from '@/lib/rate-limiter';
import { Question, ClientQuestion, Result } from '@/lib/types';
import { headers } from 'next/headers';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Generate AI quiz content using Gemini API
 * Protected by circuit breaker and rate limiting
 */
async function generateQuizContentWithAI(topic: string): Promise<Question[]> {
  const prompt = `Generate a 4-multiple-choice educational quiz about "${topic}".
Provide exactly 5 questions.
Return strictly a JSON array of objects without any markdown formatting (do NOT include \`\`\`json block quotes).
Each object must have:
"question": the question text (string),
"options": an array of exactly 4 strings,
"correctAnswer": an integer (0-3) representing the index of the correct option.`;

  return await geminiCircuitBreaker.execute(async () => {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Parse JSON, stripping any markdown formatting
    const jsonString = responseText.replace(/```(?:json)?|```/g, '').trim();
    const questions = JSON.parse(jsonString) as Question[];

    // Validate the response structure
    if (!Array.isArray(questions) || questions.length !== 5) {
      throw new Error('Invalid quiz format: expected 5 questions');
    }

    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error('Invalid question format');
      }
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
        throw new Error('Invalid correctAnswer value');
      }
    }

    return questions;
  });
}

/**
 * Generate a new quiz on the given topic
 * Implements: validation, rate limiting, circuit breaker, unique PIN generation
 */
export async function generateQuiz(topic: string): Promise<Result<{ pin: string; id: string }>> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] || 'unknown';

  try {
    // 1. Validate input
    const validation = validateTopic(topic);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0].message };
    }

    const { topic: validatedTopic } = validation.data;

    // 2. Check rate limit (strict for quiz generation - expensive operation)
    const rateLimiter = createRateLimiter('quizGeneration');
    try {
      rateLimiter.check(ip);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return { success: false, error: error.message };
      }
      throw error;
    }

    // 3. Generate quiz content with AI (protected by circuit breaker)
    let questions: Question[];
    try {
      questions = await generateQuizContentWithAI(validatedTopic);
    } catch (error) {
      if (error instanceof CircuitBreakerError) {
        return { 
          success: false, 
          error: 'AI service temporarily unavailable. Please try again in a moment.' 
        };
      }
      throw error;
    }

    // 4. Create client-safe questions (no answers)
    const clientQuestions: ClientQuestion[] = questions.map((q, i) => ({
      id: i,
      question: q.question,
      options: q.options
    }));

    // 5. Generate unique PIN with collision detection
    const pin = await generateUniquePin(4);

    // 6. Calculate expiration date
    const expiresAt = calculateExpiryDate();

    // 7. Store in Firestore via repository
    const quizRepo = getQuizRepository();
    const createResult = await quizRepo.createQuiz({
      pin,
      topic: validatedTopic,
      questions,
      clientQuestions,
      createdAt: new Date(),
      expiresAt,
      status: 'active'
    });

    if (!createResult.success) {
      return { success: false, error: createResult.error };
    }

    return { 
      success: true, 
      data: { pin, id: createResult.data! } 
    };

  } catch (error: any) {
    console.error('[Quiz Action] Error generating quiz:', error);
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    };
  }
}

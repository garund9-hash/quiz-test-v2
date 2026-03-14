/**
 * Unique PIN Generator with Collision Detection
 * Ensures no two active quizzes share the same PIN
 */

import { getQuizRepository } from '@/lib/repositories/quiz-repository';

/**
 * Generate a random PIN of specified length
 */
export function generateRandomPin(length: number = 4): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Generate a unique PIN with collision detection and retry logic
 * @param length - PIN length (default: 4)
 * @param maxAttempts - Maximum retry attempts before falling back to longer PIN
 * @returns Unique PIN string
 */
export async function generateUniquePin(
  length: number = 4,
  maxAttempts: number = 10
): Promise<string> {
  const quizRepo = getQuizRepository();
  const existingPins = new Set<string>();

  // Try to generate a unique PIN with the requested length
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pin = generateRandomPin(length);
    
    // Check if we've already tried this PIN in this session
    if (existingPins.has(pin)) {
      continue;
    }
    existingPins.add(pin);

    // Check against database
    const result = await quizRepo.findByPin(pin);
    
    // If quiz not found, PIN is available
    if (!result.success) {
      return pin;
    }

    // PIN exists, try again
    console.log(`[PIN Generator] Collision detected: ${pin}, attempt ${attempt + 1}/${maxAttempts}`);
  }

  // If we couldn't find a unique PIN with the requested length,
  // fall back to a longer PIN (much larger space)
  console.log(`[PIN Generator] Could not find unique ${length}-digit PIN, falling back to ${length + 2} digits`);
  return generateUniquePin(length + 2, maxAttempts);
}

/**
 * Validate PIN format
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Format PIN for display (adds spacing for readability)
 */
export function formatPin(pin: string): string {
  // Add space between pairs: "1234" -> "12 34"
  return pin.replace(/(\d{2})(\d{2})/, '$1 $2');
}

/**
 * Unique PIN Generator with Collision Detection
 * Ensures no two active quizzes share the same PIN
 */

import { getQuizRepository } from '@/lib/repositories/quiz-repository';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PIN_LENGTH = 4;
const MAX_GENERATION_ATTEMPTS = 10;
const PIN_LENGTH_INCREMENT = 2;

// ============================================================================
// PIN Generation Functions
// ============================================================================

/**
 * Generate a random numeric PIN of specified length
 * @param length - Number of digits in the PIN
 */
export function generateRandomPin(length: number = DEFAULT_PIN_LENGTH): string {
  const minValue = Math.pow(10, length - 1);
  const maxValue = Math.pow(10, length) - 1;
  const pin = Math.floor(minValue + Math.random() * (maxValue - minValue + 1));
  return pin.toString();
}

/**
 * Generate a unique PIN with collision detection
 * @param length - PIN length (default: 4)
 * @param maxAttempts - Maximum retry attempts before falling back to longer PIN
 * @returns Unique PIN string
 */
export async function generateUniquePin(
  length: number = DEFAULT_PIN_LENGTH,
  maxAttempts: number = MAX_GENERATION_ATTEMPTS
): Promise<string> {
  const quizRepository = getQuizRepository();
  const attemptedPins = new Set<string>();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pin = generateRandomPin(length);

    // Skip if already tried in this session
    if (attemptedPins.has(pin)) {
      continue;
    }
    attemptedPins.add(pin);

    // Check against database
    const lookupResult = await quizRepository.findByPin(pin);

    // PIN is available if not found in database
    if (!lookupResult.success) {
      return pin;
    }

    logCollision(pin, attempt + 1, maxAttempts);
  }

  // Fallback to longer PIN if collisions persist
  const fallbackLength = length + PIN_LENGTH_INCREMENT;
  logFallback(length, fallbackLength);
  return generateUniquePin(fallbackLength, maxAttempts);
}

/**
 * Validate PIN format (4 digits)
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Format PIN for display with spacing
 * @example formatPin("1234") returns "12 34"
 */
export function formatPin(pin: string): string {
  return pin.replace(/(\d{2})(\d{2})/, '$1 $2');
}

// ============================================================================
// Logging Helpers
// ============================================================================

function logCollision(pin: string, attempt: number, maxAttempts: number): void {
  console.log(
    `[PIN Generator] Collision detected: ${pin}, attempt ${attempt}/${maxAttempts}`
  );
}

function logFallback(originalLength: number, newLength: number): void {
  console.log(
    `[PIN Generator] Could not find unique ${originalLength}-digit PIN, ` +
    `falling back to ${newLength} digits`
  );
}

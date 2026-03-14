import { z } from 'zod';

/**
 * Input validation schemas using Zod
 * Provides type-safe validation with descriptive error messages
 */

// ============================================================================
// Schema Definitions
// ============================================================================

/** Validates quiz topic input */
export const topicSchema = z.object({
  topic: z
    .string()
    .min(3, 'Topic must be at least 3 characters')
    .max(200, 'Topic must be less than 200 characters')
    .trim()
    .refine(
      (value) => value.length > 0,
      'Topic cannot be empty or just whitespace'
    )
});

/** Validates user nickname for quiz participation */
export const nicknameSchema = z.object({
  nickname: z
    .string()
    .min(1, 'Nickname is required')
    .max(20, 'Nickname must be less than 20 characters')
    .regex(
      /^[a-zA-Z0-9_\s-]+$/,
      'Nickname can only contain letters, numbers, spaces, underscores, and hyphens'
    )
    .trim()
});

/** Validates quiz answer submissions */
export const answersSchema = z.object({
  answers: z
    .array(z.number().int().min(-1).max(3))
    .min(1, 'At least one answer is required')
});

/** Validates 4-digit quiz PIN */
export const pinSchema = z.object({
  pin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only digits')
});

// ============================================================================
// Combined Schemas
// ============================================================================

/** Validates quiz join request (PIN + nickname) */
export const joinQuizSchema = z.object({
  pin: pinSchema.shape.pin,
  nickname: nicknameSchema.shape.nickname
});

/** Validates quiz submission (PIN + nickname + answers) */
export const submitQuizSchema = z.object({
  pin: pinSchema.shape.pin,
  nickname: nicknameSchema.shape.nickname,
  answers: answersSchema.shape.answers
});

// ============================================================================
// Type Exports
// ============================================================================

export type TopicInput = z.infer<typeof topicSchema>;
export type NicknameInput = z.infer<typeof nicknameSchema>;
export type AnswersInput = z.infer<typeof answersSchema>;
export type PinInput = z.infer<typeof pinSchema>;
export type JoinQuizInput = z.infer<typeof joinQuizSchema>;
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validate quiz topic
 * @returns SafeParseResult with validated topic or error details
 */
export function validateTopic(topic: string) {
  return topicSchema.safeParse({ topic });
}

/**
 * Validate user nickname
 * @returns SafeParseResult with validated nickname or error details
 */
export function validateNickname(nickname: string) {
  return nicknameSchema.safeParse({ nickname });
}

/**
 * Validate quiz answers array
 * @returns SafeParseResult with validated answers or error details
 */
export function validateAnswers(answers: number[]) {
  return answersSchema.safeParse({ answers });
}

/**
 * Validate quiz PIN format
 * @returns SafeParseResult with validated PIN or error details
 */
export function validatePin(pin: string) {
  return pinSchema.safeParse({ pin });
}

/**
 * Validate quiz join request
 * @returns SafeParseResult with validated input or error details
 */
export function validateJoinQuiz(input: { pin: string; nickname: string }) {
  return joinQuizSchema.safeParse(input);
}

/**
 * Validate complete quiz submission
 * @returns SafeParseResult with validated input or error details
 */
export function validateQuizSubmission(input: { 
  pin: string; 
  nickname: string; 
  answers: number[] 
}) {
  return submitQuizSchema.safeParse(input);
}

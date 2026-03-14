import { z } from 'zod';

/**
 * Validation schemas for the Educational AI Quiz Platform
 * Ensures type safety and input validation across the application
 */

// Quiz topic validation
export const topicSchema = z.object({
  topic: z
    .string()
    .min(3, 'Topic must be at least 3 characters')
    .max(200, 'Topic must be less than 200 characters')
    .trim()
    .refine(
      (val) => val.length > 0,
      'Topic cannot be empty or just whitespace'
    )
});

// Nickname validation for learners
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

// Answer submission validation
export const answersSchema = z.object({
  answers: z
    .array(z.number().int().min(-1).max(3))
    .min(1, 'At least one answer is required')
});

// PIN validation
export const pinSchema = z.object({
  pin: z
    .string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only digits')
});

// Combined schemas for specific use cases
export const joinQuizSchema = z.object({
  pin: pinSchema.shape.pin,
  nickname: nicknameSchema.shape.nickname
});

export const submitQuizSchema = z.object({
  pin: pinSchema.shape.pin,
  nickname: nicknameSchema.shape.nickname,
  answers: answersSchema.shape.answers
});

// Type exports
export type TopicInput = z.infer<typeof topicSchema>;
export type NicknameInput = z.infer<typeof nicknameSchema>;
export type AnswersInput = z.infer<typeof answersSchema>;
export type PinInput = z.infer<typeof pinSchema>;
export type JoinQuizInput = z.infer<typeof joinQuizSchema>;
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;

/**
 * Validation helper functions
 */
export function validateTopic(topic: string) {
  return topicSchema.safeParse({ topic });
}

export function validateNickname(nickname: string) {
  return nicknameSchema.safeParse({ nickname });
}

export function validateAnswers(answers: number[]) {
  return answersSchema.safeParse({ answers });
}

export function validatePin(pin: string) {
  return pinSchema.safeParse({ pin });
}

export function validateJoinQuiz(input: { pin: string; nickname: string }) {
  return joinQuizSchema.safeParse(input);
}

export function validateSubmitQuiz(input: { pin: string; nickname: string; answers: number[] }) {
  return submitQuizSchema.safeParse(input);
}

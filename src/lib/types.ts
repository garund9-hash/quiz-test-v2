/**
 * Domain types and interfaces for the Quiz Platform
 * Defines the core business entities
 */

// Question structure
export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

// Client-safe question (no answers)
export interface ClientQuestion {
  id: number;
  question: string;
  options: string[];
}

// Quiz document structure
export interface Quiz {
  id?: string;
  pin: string;
  topic: string;
  questions: Question[];
  clientQuestions: ClientQuestion[];
  createdAt: Date | null;
  expiresAt: Date | null;
  status: 'active' | 'expired' | 'archived';
}

// Score/leaderboard entry
export interface ScoreEntry {
  id?: string;
  quizId: string;
  pin: string;
  nickname: string;
  score: number;
  total: number;
  scorePercentage: number;
  submittedAt: Date | null;
}

// Result types for service operations
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Repository interfaces
export interface QuizRepository {
  createQuiz(quiz: Omit<Quiz, 'id'>): Promise<Result<string>>;
  findByPin(pin: string): Promise<Result<Quiz>>;
  findActiveByPin(pin: string): Promise<Result<Quiz>>;
  updateStatus(id: string, status: Quiz['status']): Promise<Result<void>>;
  deleteQuiz(id: string): Promise<Result<void>>;
}

export interface ScoreRepository {
  createScore(score: Omit<ScoreEntry, 'id'>): Promise<Result<string>>;
  findByPin(pin: string): Promise<Result<ScoreEntry[]>>;
  deleteByQuizId(quizId: string): Promise<Result<void>>;
}

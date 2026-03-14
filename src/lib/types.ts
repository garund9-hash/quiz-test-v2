/**
 * Domain types and interfaces
 * Core business entities for the Quiz Platform
 */

// ============================================================================
// Question Types
// ============================================================================

/** Complete question with correct answer (server-side only) */
export interface Question {
  /** Question text */
  question: string;
  /** Array of 4 possible answers */
  options: string[];
  /** Index of correct answer (0-3) */
  correctAnswer: number;
}

/** Client-safe question without answer information */
export interface ClientQuestion {
  /** Unique question identifier */
  id: number;
  /** Question text */
  question: string;
  /** Array of 4 possible answers */
  options: string[];
}

// ============================================================================
// Quiz Types
// ============================================================================

/** Quiz status in the system */
export type QuizStatus = 'active' | 'expired' | 'archived';

/** Complete quiz document structure */
export interface Quiz {
  /** Firestore document ID */
  id?: string;
  /** 4-digit access PIN */
  pin: string;
  /** Quiz topic/title */
  topic: string;
  /** Full questions with answers (server-side only) */
  questions: Question[];
  /** Questions without answers (client-safe) */
  clientQuestions: ClientQuestion[];
  /** Creation timestamp */
  createdAt: Date | null;
  /** Expiration timestamp */
  expiresAt: Date | null;
  /** Current quiz status */
  status: QuizStatus;
}

// ============================================================================
// Score/Leaderboard Types
// ============================================================================

/** Leaderboard entry for a quiz attempt */
export interface ScoreEntry {
  /** Firestore document ID */
  id?: string;
  /** Reference to quiz document */
  quizId: string;
  /** Quiz PIN for lookup */
  pin: string;
  /** User's display name */
  nickname: string;
  /** Number of correct answers */
  score: number;
  /** Total number of questions */
  total: number;
  /** Score as percentage (0-100) */
  scorePercentage: number;
  /** Submission timestamp */
  submittedAt: Date | null;
}

// ============================================================================
// Operation Result Types
// ============================================================================

/** Standardized result type for service operations */
export interface OperationResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data (only present on success) */
  data?: T;
  /** Error message (only present on failure) */
  error?: string;
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/** Quiz data access interface */
export interface QuizRepository {
  /**
   * Create a new quiz
   * @param quiz - Quiz data without ID
   * @returns Document ID on success
   */
  createQuiz(quiz: Omit<Quiz, 'id'>): Promise<OperationResult<string>>;
  
  /**
   * Find quiz by PIN (includes expired)
   * @param pin - 4-digit quiz PIN
   * @returns Quiz data on success
   */
  findByPin(pin: string): Promise<OperationResult<Quiz>>;
  
  /**
   * Find active quiz by PIN (excludes expired)
   * @param pin - 4-digit quiz PIN
   * @returns Quiz data on success
   */
  findActiveByPin(pin: string): Promise<OperationResult<Quiz>>;
  
  /**
   * Update quiz status
   * @param id - Quiz document ID
   * @param status - New status value
   */
  updateStatus(id: string, status: QuizStatus): Promise<OperationResult<void>>;
  
  /**
   * Delete quiz permanently
   * @param id - Quiz document ID
   */
  deleteQuiz(id: string): Promise<OperationResult<void>>;
}

/** Score/leaderboard data access interface */
export interface ScoreRepository {
  /**
   * Record a new score
   * @param score - Score data without ID
   * @returns Document ID on success
   */
  createScore(score: Omit<ScoreEntry, 'id'>): Promise<OperationResult<string>>;
  
  /**
   * Get all scores for a quiz PIN
   * @param pin - 4-digit quiz PIN
   * @returns Array of score entries sorted by rank
   */
  findByPin(pin: string): Promise<OperationResult<ScoreEntry[]>>;
  
  /**
   * Delete all scores for a quiz
   * @param quizId - Quiz document ID
   */
  deleteByQuizId(quizId: string): Promise<OperationResult<void>>;
}

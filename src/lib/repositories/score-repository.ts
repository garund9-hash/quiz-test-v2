import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { ScoreEntry, ScoreRepository, OperationResult } from '@/lib/types';

// ============================================================================
// Firestore Score Repository Implementation
// ============================================================================

/**
 * Firestore implementation of ScoreRepository
 * Handles all score/leaderboard-related database operations
 */
export class FirestoreScoreRepository implements ScoreRepository {
  private static readonly COLLECTION_NAME = 'leaderboard';

  // ============================================================================
  // Public Methods
  // ============================================================================

  async createScore(score: Omit<ScoreEntry, 'id'>): Promise<OperationResult<string>> {
    return this.executeWithErrorHandling(async () => {
      const documentReference = await addDoc(this.getCollection(), {
        quizId: score.quizId,
        pin: score.pin,
        nickname: score.nickname,
        score: score.score,
        total: score.total,
        scorePercentage: score.scorePercentage,
        submittedAt: serverTimestamp()
      });

      return { success: true, data: documentReference.id };
    }, 'create score');
  }

  async findByPin(pin: string): Promise<OperationResult<ScoreEntry[]>> {
    return this.executeWithErrorHandling(async () => {
      const dbQuery = query(this.getCollection(), where('pin', '==', pin));
      const snapshot = await getDocs(dbQuery);

      const scores = snapshot.docs.map(document => 
        this.mapToScoreEntry(document.data(), document.id)
      );

      this.sortScoresByRank(scores);

      return { success: true, data: scores };
    }, 'fetch leaderboard');
  }

  async deleteByQuizId(quizId: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(async () => {
      const dbQuery = query(this.getCollection(), where('quizId', '==', quizId));
      const snapshot = await getDocs(dbQuery);

      const batch = writeBatch(db);
      snapshot.docs.forEach(documentSnapshot => {
        batch.delete(documentSnapshot.ref);
      });

      await batch.commit();

      return { success: true };
    }, 'delete scores');
  }

  // ============================================================================
  // Private Methods - Data Access
  // ============================================================================

  private getCollection() {
    return collection(db, FirestoreScoreRepository.COLLECTION_NAME);
  }

  // ============================================================================
  // Private Methods - Data Mapping
  // ============================================================================

  private mapToScoreEntry(
    documentData: Record<string, unknown>, 
    id: string
  ): ScoreEntry {
    return {
      id,
      quizId: documentData.quizId as string,
      pin: documentData.pin as string,
      nickname: documentData.nickname as string,
      score: documentData.score as number,
      total: documentData.total as number,
      scorePercentage: documentData.scorePercentage as number,
      submittedAt: this.fromFirestoreTimestamp(documentData.submittedAt as Timestamp | null)
    };
  }

  private fromFirestoreTimestamp(
    timestamp: Timestamp | null | undefined
  ): Date | null {
    if (!timestamp) return null;
    return timestamp.toDate();
  }

  // ============================================================================
  // Private Methods - Business Logic
  // ============================================================================

  private sortScoresByRank(scores: ScoreEntry[]): void {
    scores.sort((first, second) => {
      // Primary sort: score (descending)
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      // Secondary sort: submission time (ascending - earlier is better)
      const firstTime = first.submittedAt?.getTime() ?? 0;
      const secondTime = second.submittedAt?.getTime() ?? 0;
      return firstTime - secondTime;
    });
  }

  // ============================================================================
  // Private Methods - Error Handling
  // ============================================================================

  private async executeWithErrorHandling<T>(
    operation: () => Promise<OperationResult<T>>,
    operationName: string
  ): Promise<OperationResult<T>> {
    try {
      return await operation();
    } catch (error: unknown) {
      const errorMessage = this.extractErrorMessage(error);
      console.error(`Error ${operationName}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message || 'Failed to perform operation';
    }
    return 'Failed to perform operation';
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let scoreRepositoryInstance: FirestoreScoreRepository | null = null;

export function getScoreRepository(): ScoreRepository {
  if (!scoreRepositoryInstance) {
    scoreRepositoryInstance = new FirestoreScoreRepository();
  }
  return scoreRepositoryInstance;
}

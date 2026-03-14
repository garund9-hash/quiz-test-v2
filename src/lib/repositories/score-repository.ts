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
import { ScoreEntry, ScoreRepository, Result } from '@/lib/types';

/**
 * Firestore implementation of ScoreRepository
 * Handles all score/leaderboard-related database operations
 */
export class FirestoreScoreRepository implements ScoreRepository {
  private readonly collectionName = 'leaderboard';

  private getCollection() {
    return collection(db, this.collectionName);
  }

  private fromFirestoreDate(timestamp: Timestamp | null | undefined): Date | null {
    if (!timestamp) return null;
    return timestamp.toDate();
  }

  private mapToScoreEntry(docData: any, id: string): ScoreEntry {
    return {
      id,
      quizId: docData.quizId,
      pin: docData.pin,
      nickname: docData.nickname,
      score: docData.score,
      total: docData.total,
      scorePercentage: docData.scorePercentage,
      submittedAt: this.fromFirestoreDate(docData.submittedAt)
    };
  }

  async createScore(score: Omit<ScoreEntry, 'id'>): Promise<Result<string>> {
    try {
      const docRef = await addDoc(this.getCollection(), {
        quizId: score.quizId,
        pin: score.pin,
        nickname: score.nickname,
        score: score.score,
        total: score.total,
        scorePercentage: score.scorePercentage,
        submittedAt: serverTimestamp()
      });

      return { success: true, data: docRef.id };
    } catch (error: any) {
      console.error('Error creating score:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to save score' 
      };
    }
  }

  async findByPin(pin: string): Promise<Result<ScoreEntry[]>> {
    try {
      const q = query(this.getCollection(), where('pin', '==', pin));
      const snapshot = await getDocs(q);

      const scores = snapshot.docs.map(doc => 
        this.mapToScoreEntry(doc.data(), doc.id)
      );

      // Sort by score (descending), then by submission time (ascending)
      scores.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        const aTime = a.submittedAt?.getTime() || 0;
        const bTime = b.submittedAt?.getTime() || 0;
        return aTime - bTime;
      });

      return { success: true, data: scores };
    } catch (error: any) {
      console.error('Error finding scores by PIN:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch leaderboard' 
      };
    }
  }

  async deleteByQuizId(quizId: string): Promise<Result<void>> {
    try {
      const q = query(this.getCollection(), where('quizId', '==', quizId));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref);
      });

      await batch.commit();

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting scores:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to delete scores' 
      };
    }
  }
}

// Singleton instance
let scoreRepositoryInstance: FirestoreScoreRepository | null = null;

export function getScoreRepository(): ScoreRepository {
  if (!scoreRepositoryInstance) {
    scoreRepositoryInstance = new FirestoreScoreRepository();
  }
  return scoreRepositoryInstance;
}

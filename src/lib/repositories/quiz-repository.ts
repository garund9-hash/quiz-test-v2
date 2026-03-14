import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { Quiz, QuizRepository, Result } from '@/lib/types';

/**
 * Firestore implementation of QuizRepository
 * Handles all quiz-related database operations
 */
export class FirestoreQuizRepository implements QuizRepository {
  private readonly collectionName = 'quizzes';

  private getCollection() {
    return collection(db, this.collectionName);
  }

  private toFirestoreDate(date: Date | null) {
    return date ? Timestamp.fromDate(date) : null;
  }

  private fromFirestoreDate(timestamp: Timestamp | null | undefined): Date | null {
    if (!timestamp) return null;
    return timestamp.toDate();
  }

  private mapToQuiz(docData: any, id: string): Quiz {
    return {
      id,
      pin: docData.pin,
      topic: docData.topic,
      questions: docData.questions || [],
      clientQuestions: docData.clientQuestions || [],
      createdAt: this.fromFirestoreDate(docData.createdAt),
      expiresAt: this.fromFirestoreDate(docData.expiresAt),
      status: docData.status || 'active'
    };
  }

  async createQuiz(quiz: Omit<Quiz, 'id'>): Promise<Result<string>> {
    try {
      const docRef = await addDoc(this.getCollection(), {
        pin: quiz.pin,
        topic: quiz.topic,
        questions: quiz.questions,
        clientQuestions: quiz.clientQuestions,
        createdAt: serverTimestamp(),
        expiresAt: this.toFirestoreDate(quiz.expiresAt),
        status: quiz.status
      });

      return { success: true, data: docRef.id };
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create quiz' 
      };
    }
  }

  async findByPin(pin: string): Promise<Result<Quiz>> {
    try {
      const q = query(this.getCollection(), where('pin', '==', pin));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: false, error: 'Quiz not found' };
      }

      const doc = snapshot.docs[0];
      return { success: true, data: this.mapToQuiz(doc.data(), doc.id) };
    } catch (error: any) {
      console.error('Error finding quiz by PIN:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to find quiz' 
      };
    }
  }

  async findActiveByPin(pin: string): Promise<Result<Quiz>> {
    try {
      const q = query(
        this.getCollection(),
        where('pin', '==', pin),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: false, error: 'Quiz not found or not active' };
      }

      const doc = snapshot.docs[0];
      return { success: true, data: this.mapToQuiz(doc.data(), doc.id) };
    } catch (error: any) {
      console.error('Error finding active quiz:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to find quiz' 
      };
    }
  }

  async updateStatus(id: string, status: Quiz['status']): Promise<Result<void>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, { status });

      return { success: true };
    } catch (error: any) {
      console.error('Error updating quiz status:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update quiz status' 
      };
    }
  }

  async deleteQuiz(id: string): Promise<Result<void>> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting quiz:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to delete quiz' 
      };
    }
  }
}

// Singleton instance
let quizRepositoryInstance: FirestoreQuizRepository | null = null;

export function getQuizRepository(): QuizRepository {
  if (!quizRepositoryInstance) {
    quizRepositoryInstance = new FirestoreQuizRepository();
  }
  return quizRepositoryInstance;
}

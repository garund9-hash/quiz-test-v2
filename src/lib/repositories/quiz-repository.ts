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
import { Quiz, QuizRepository, OperationResult } from '@/lib/types';

// ============================================================================
// Firestore Quiz Repository Implementation
// ============================================================================

/**
 * Firestore implementation of QuizRepository
 * Handles all quiz-related database operations
 */
export class FirestoreQuizRepository implements QuizRepository {
  private static readonly COLLECTION_NAME = 'quizzes';

  // ============================================================================
  // Public Methods
  // ============================================================================

  async createQuiz(quiz: Omit<Quiz, 'id'>): Promise<OperationResult<string>> {
    return this.executeWithErrorHandling(async () => {
      const documentReference = await addDoc(this.getCollection(), {
        pin: quiz.pin,
        topic: quiz.topic,
        questions: quiz.questions,
        clientQuestions: quiz.clientQuestions,
        createdAt: serverTimestamp(),
        expiresAt: this.toFirestoreTimestamp(quiz.expiresAt),
        status: quiz.status
      });

      return { success: true, data: documentReference.id };
    }, 'create quiz');
  }

  async findByPin(pin: string): Promise<OperationResult<Quiz>> {
    return this.executeWithErrorHandling(async () => {
      const quiz = await this.fetchQuizByPin(pin);
      
      if (!quiz) {
        return { success: false, error: 'Quiz not found' };
      }

      return { success: true, data: quiz };
    }, 'find quiz by PIN');
  }

  async findActiveByPin(pin: string): Promise<OperationResult<Quiz>> {
    return this.executeWithErrorHandling(async () => {
      const quiz = await this.fetchActiveQuizByPin(pin);
      
      if (!quiz) {
        return { success: false, error: 'Quiz not found or not active' };
      }

      return { success: true, data: quiz };
    }, 'find active quiz');
  }

  async updateStatus(id: string, status: Quiz['status']): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(async () => {
      const documentReference = doc(db, FirestoreQuizRepository.COLLECTION_NAME, id);
      await updateDoc(documentReference, { status });

      return { success: true };
    }, 'update quiz status');
  }

  async deleteQuiz(id: string): Promise<OperationResult<void>> {
    return this.executeWithErrorHandling(async () => {
      const documentReference = doc(db, FirestoreQuizRepository.COLLECTION_NAME, id);
      await deleteDoc(documentReference);

      return { success: true };
    }, 'delete quiz');
  }

  // ============================================================================
  // Private Methods - Data Access
  // ============================================================================

  private getCollection() {
    return collection(db, FirestoreQuizRepository.COLLECTION_NAME);
  }

  private async fetchQuizByPin(pin: string): Promise<Quiz | null> {
    const dbQuery = query(this.getCollection(), where('pin', '==', pin));
    const snapshot = await getDocs(dbQuery);

    if (snapshot.empty) return null;

    const document = snapshot.docs[0];
    return this.mapToQuiz(document.data(), document.id);
  }

  private async fetchActiveQuizByPin(pin: string): Promise<Quiz | null> {
    const dbQuery = query(
      this.getCollection(),
      where('pin', '==', pin),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(dbQuery);

    if (snapshot.empty) return null;

    const document = snapshot.docs[0];
    return this.mapToQuiz(document.data(), document.id);
  }

  // ============================================================================
  // Private Methods - Data Mapping
  // ============================================================================

  private mapToQuiz(documentData: Record<string, unknown>, id: string): Quiz {
    return {
      id,
      pin: documentData.pin as string,
      topic: documentData.topic as string,
      questions: (documentData.questions as Quiz['questions']) || [],
      clientQuestions: (documentData.clientQuestions as Quiz['clientQuestions']) || [],
      createdAt: this.fromFirestoreTimestamp(documentData.createdAt as Timestamp | null),
      expiresAt: this.fromFirestoreTimestamp(documentData.expiresAt as Timestamp | null),
      status: (documentData.status as Quiz['status']) || 'active'
    };
  }

  private toFirestoreTimestamp(date: Date | null): Timestamp | null {
    return date ? Timestamp.fromDate(date) : null;
  }

  private fromFirestoreTimestamp(
    timestamp: Timestamp | null | undefined
  ): Date | null {
    if (!timestamp) return null;
    return timestamp.toDate();
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
      return error.message || 'Unknown error occurred';
    }
    return 'Unknown error occurred';
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let quizRepositoryInstance: FirestoreQuizRepository | null = null;

export function getQuizRepository(): QuizRepository {
  if (!quizRepositoryInstance) {
    quizRepositoryInstance = new FirestoreQuizRepository();
  }
  return quizRepositoryInstance;
}

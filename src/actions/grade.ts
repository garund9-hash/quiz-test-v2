'use server'

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export async function getClientQuiz(pin: string) {
  try {
    const q = query(collection(db, 'quizzes'), where('pin', '==', pin), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, error: 'Quiz not found or not active' };
    }

    const quizData = snapshot.docs[0].data();
    
    return { 
      success: true, 
      topic: quizData.topic,
      clientQuestions: quizData.clientQuestions 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitQuizAnswers(pin: string, nickname: string, answers: number[]) {
  try {
    const q = query(collection(db, 'quizzes'), where('pin', '==', pin));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, error: 'Quiz not found' };
    }

    const quizDoc = snapshot.docs[0];
    const quizData = quizDoc.data();
    
    let score = 0;
    const total = quizData.questions.length;

    // Secure server-side grading (answers are NOT sent to client)
    answers.forEach((ans, index) => {
      // Allow for 0 score if ans is -1 (unanswered)
      if (ans !== -1 && index < total && Number(quizData.questions[index].correctAnswer) === Number(ans)) {
        score += 1;
      }
    });

    const scorePercentage = Math.round((score / total) * 100);

    // Save to leaderboard
    await addDoc(collection(db, 'leaderboard'), {
      quizId: quizDoc.id,
      pin: pin,
      nickname,
      score,
      total,
      scorePercentage,
      submittedAt: serverTimestamp()
    });

    return { 
      success: true, 
      score, 
      total,
      scorePercentage
    };
  } catch (error: any) {
    console.error('Error grading quiz:', error);
    return { success: false, error: error.message };
  }
}

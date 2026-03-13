'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateQuiz(topic: string) {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not found in environment");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Generate a 4-multiple-choice educational quiz about "${topic}".
Provide exactly 5 questions.
Return strictly a JSON array of objects without any markdown formatting (do NOT include \`\`\`json block quotes). 
Each object must have:
"question": the question text (string),
"options": an array of exactly 4 strings,
"correctAnswer": an integer (0-3) representing the index of the correct option.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    // Safely parse JSON by stripping markdown
    const jsonString = responseText.replace(/```(?:json)?|```/g, '').trim();
    const questions = JSON.parse(jsonString);

    // Provide a simplified view of the quiz for the client (no answers exposed)
    const clientQuestions = questions.map((q: any, i: number) => ({
      id: i,
      question: q.question,
      options: q.options
    }));

    // Generate a 4-digit PIN for joining
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    // Store in Firestore
    const docRef = await addDoc(collection(db, 'quizzes'), {
      pin,
      topic,
      questions: questions, // Secret answers stored securely
      clientQuestions: clientQuestions, // Safe version for frontend
      createdAt: serverTimestamp(),
      status: 'active'
    });

    return { success: true, pin, id: docRef.id };
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

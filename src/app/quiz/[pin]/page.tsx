'use client';

import { useState, useEffect, use } from 'react';
import { getClientQuiz, submitQuizAnswers } from '@/actions/grade';
import Link from 'next/link';

export default function QuizPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = use(params);
  const [nickname, setNickname] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    async function loadQuiz() {
      const res = await getClientQuiz(pin);
      if (res.success) {
        setQuizData(res);
        setAnswers(new Array(res.clientQuestions.length).fill(-1));
      } else {
        setError(res.error || 'Quiz not found');
      }
      setLoading(false);
    }
    loadQuiz();
  }, [pin]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim().length > 0) {
      setHasJoined(true);
    }
  };

  const selectOption = (optIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = optIndex;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQ < (quizData?.clientQuestions?.length || 0) - 1) {
      setCurrentQ(currentQ + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await submitQuizAnswers(pin, nickname, answers);
    if (res.success) {
      setResult(res);
    } else {
      alert(res.error || 'Failed to submit quiz');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="container flex-center" style={{ minHeight: '80vh' }}>Loading...</div>;
  if (error) return <div className="container flex-center" style={{ minHeight: '80vh' }}>{error}</div>;

  if (result) {
    return (
      <div className="container flex-col items-center flex-center animate-fade" style={{ minHeight: '80vh' }}>
        <div className="card w-full text-center" style={{ maxWidth: '500px' }}>
          <h1 className="text-4xl mb-4 text-gradient">Quiz Complete!</h1>
          <p className="text-xl mb-6">{nickname}, you scored:</p>
          
          <div className="glass-panel text-4xl p-6 font-bold flex-center mb-6" style={{ color: 'var(--primary)', letterSpacing: '2px' }}>
            {result.score} / {result.total}
          </div>
          
          <Link href={`/quiz/${pin}/leaderboard`} className="btn btn-primary w-full text-center block">
            View Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="container flex-col items-center flex-center animate-fade" style={{ minHeight: '80vh' }}>
        <div className="card w-full" style={{ maxWidth: '400px' }}>
          <h1 className="text-4xl mb-2 text-gradient text-center">Join Quiz</h1>
          <p className="text-sm mb-6 text-center">Topic: {quizData?.topic}</p>
          
          <form onSubmit={handleJoin} className="flex-col gap-6">
            <input 
              type="text" 
              className="input-field text-center" 
              placeholder="Enter Nickname" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              maxLength={20}
            />
            <button type="submit" className="btn btn-primary w-full block">Start Quiz</button>
          </form>
        </div>
      </div>
    );
  }

  const question = quizData?.clientQuestions?.[currentQ];

  if (!question) return null;

  return (
    <div className="container flex-col items-center flex-center animate-in" style={{ minHeight: '80vh' }}>
      <div className="card w-full" style={{ maxWidth: '600px' }}>
        <div className="flex-center justify-between mb-6" style={{ display: 'flex' }}>
          <span className="text-sm">Question {currentQ + 1} of {quizData?.clientQuestions?.length || 0}</span>
          <span className="text-sm" style={{ color: 'var(--primary)' }}>{nickname}</span>
        </div>
        
        <h2 className="text-xl mb-6">{question?.question}</h2>
        
        <div className="flex-col gap-4 mb-8">
          {question?.options?.map((opt: string, i: number) => {
            const isSelected = answers[currentQ] === i;
            return (
              <button 
                key={i}
                className="input-field text-left"
                style={{ 
                  padding: '1rem', 
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(99, 102, 241, 0.2)' : undefined,
                  borderColor: isSelected ? 'var(--primary)' : undefined
                }}
                onClick={() => selectOption(i)}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <div className="flex-center justify-between gap-4" style={{ display: 'flex' }}>
          <button className="btn" disabled={currentQ === 0} onClick={prevQuestion}>
            Previous
          </button>
          
          {currentQ === (quizData?.clientQuestions?.length || 1) - 1 ? (
             <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
               {submitting ? 'Submitting...' : 'Submit Quiz'}
             </button>
          ) : (
            <button className="btn btn-primary" onClick={nextQuestion}>
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

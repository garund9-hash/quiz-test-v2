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
      if (res.success && res.clientQuestions) {
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

  if (loading) {
    return (
      <div className="container flex-center flex-col" style={{ minHeight: '80vh' }}>
        <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '3px', borderTopColor: 'var(--primary)' }}></div>
        <p className="mt-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>Loading quiz...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container flex-center flex-col" style={{ minHeight: '80vh' }}>
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl mb-2 text-gradient-rose">Quiz Not Found</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--foreground-muted)' }}>{error}</p>
        <Link href="/" className="btn btn-primary">
          <span>Back to Home</span>
        </Link>
      </div>
    );
  }

  // Result Screen
  if (result) {
    const percentage = Math.round((result.score / result.total) * 100);
    
    return (
      <div className="container flex-col items-center flex-center animate-fade" style={{ minHeight: '85vh', padding: '3rem 2rem' }}>
        <div className="glass-panel text-center" style={{ 
          width: '100%', 
          maxWidth: '520px',
          padding: '3rem 2.5rem'
        }}>
          {/* Animated Result Icon */}
          <div className="animate-scale mb-8" style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: percentage >= 70 ? 'var(--success-bg)' : percentage >= 40 ? 'rgba(245, 158, 11, 0.15)' : 'var(--error-bg)',
            border: `3px solid ${percentage >= 70 ? 'var(--success)' : percentage >= 40 ? 'var(--primary)' : 'var(--error)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 60px ${percentage >= 70 ? 'var(--success-bg)' : percentage >= 40 ? 'var(--primary-glow)' : 'var(--error-bg)'}`
          }}>
            <span className="text-5xl">
              {percentage >= 70 ? '🏆' : percentage >= 40 ? '👍' : '📚'}
            </span>
          </div>

          <h1 className="text-4xl mb-2 text-gradient-gold">Quiz Complete!</h1>
          <p className="text-lg mb-8" style={{ color: 'var(--foreground-muted)' }}>
            Great effort, <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{nickname}</span>!
          </p>

          {/* Score Display */}
          <div className="glass-panel mb-8" style={{
            padding: '2rem',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '2px solid var(--primary)',
            boxShadow: '0 0 40px var(--primary-glow)'
          }}>
            <div className="text-sm mb-2" style={{ color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.75rem' }}>Your Score</div>
            <div className="text-6xl font-bold mb-2" style={{ 
              color: 'var(--primary)',
              fontFamily: 'var(--font-display)',
              textShadow: '0 0 40px var(--primary-glow)'
            }}>
              {result.score}<span style={{ fontSize: '2rem', color: 'var(--foreground-muted)' }}>/ {result.total}</span>
            </div>
            <div className="text-lg" style={{ 
              color: percentage >= 70 ? 'var(--success)' : percentage >= 40 ? 'var(--primary)' : 'var(--error)',
              fontWeight: 600
            }}>
              {percentage}% Correct
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-col gap-3">
            <Link 
              href={`/quiz/${pin}/leaderboard`} 
              className="btn btn-primary btn-full"
              style={{ padding: '1rem', fontSize: '1rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
              <span>View Leaderboard</span>
            </Link>
            
            <Link 
              href="/" 
              className="btn btn-full"
              style={{ 
                padding: '1rem', 
                fontSize: '1rem',
                border: '1px solid var(--border)'
              }}
            >
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Join Screen
  if (!hasJoined) {
    return (
      <div className="container flex-col items-center flex-center animate-fade" style={{ minHeight: '85vh', padding: '3rem 2rem' }}>
        <div className="glass-panel" style={{ 
          width: '100%', 
          maxWidth: '440px',
          padding: '2.5rem'
        }}>
          <div className="text-center mb-8">
            <div className="text-5xl mb-4 animate-float">🚀</div>
            <h1 className="text-4xl mb-3 text-gradient-gold">Join Quiz</h1>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Ready to test your knowledge?
            </p>
          </div>

          {/* Quiz Info */}
          <div className="glass-panel mb-6" style={{
            padding: '1.25rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border)'
          }}>
            <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Topic</div>
            <div className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{quizData?.topic}</div>
            <div className="divider" style={{ margin: '0.75rem 0' }}></div>
            <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Questions</div>
            <div className="text-base" style={{ color: 'var(--foreground)' }}>{quizData?.clientQuestions?.length || 0} questions</div>
          </div>

          <form onSubmit={handleJoin} className="flex-col gap-5">
            <div className="flex-col gap-2">
              <label htmlFor="nickname" className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Your Nickname
              </label>
              <input
                id="nickname"
                type="text"
                className="input-field text-center"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={20}
                autoFocus
                style={{ fontSize: '1.1rem', padding: '1.125rem' }}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              style={{ padding: '1.125rem', fontSize: '1.05rem', marginTop: '0.5rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              <span>Start Quiz</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Quiz Taking Screen
  const question = quizData?.clientQuestions?.[currentQ];
  const totalQuestions = quizData?.clientQuestions?.length || 0;
  const progress = ((currentQ + 1) / totalQuestions) * 100;
  const answeredCount = answers.filter((a: number) => a !== -1).length;

  if (!question) return null;

  return (
    <div className="container flex-col items-center flex-center" style={{ minHeight: '85vh', padding: '3rem 2rem' }}>
      <div className="glass-panel" style={{ 
        width: '100%', 
        maxWidth: '680px',
        padding: '2.5rem'
      }}>
        {/* Header Bar */}
        <div className="flex-center justify-between mb-6" style={{ display: 'flex' }}>
          <div className="flex-center gap-3">
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
              Question {currentQ + 1} / {totalQuestions}
            </span>
          </div>
          <div className="flex-center gap-2" style={{ display: 'flex', color: 'var(--primary)', fontWeight: 600 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span style={{ fontSize: '0.95rem' }}>{nickname}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8" style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '9999px',
          overflow: 'hidden'
        }}>
          <div className="animate-slide-up" style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
            borderRadius: '9999px',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 20px var(--primary-glow)'
          }}></div>
        </div>

        {/* Question */}
        <h2 className="text-2xl mb-8" style={{ 
          color: 'var(--foreground)',
          fontWeight: 600,
          lineHeight: 1.4
        }}>
          {question?.question}
        </h2>

        {/* Options */}
        <div className="flex-col gap-3 mb-8">
          {question?.options?.map((opt: string, i: number) => {
            const isSelected = answers[currentQ] === i;
            return (
              <button
                key={i}
                className="input-field text-left animate-slide-up"
                style={{
                  padding: '1.25rem 1.5rem',
                  cursor: 'pointer',
                  background: isSelected 
                    ? 'rgba(245, 158, 11, 0.15)' 
                    : 'rgba(15, 20, 35, 0.6)',
                  borderColor: isSelected 
                    ? 'var(--primary)' 
                    : 'var(--border)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  animationDelay: `${i * 0.08}s`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => selectOption(i)}
              >
                {/* Option Letter */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  marginRight: '12px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  background: isSelected 
                    ? 'var(--primary)' 
                    : 'rgba(255, 255, 255, 0.08)',
                  color: isSelected ? '#000' : 'var(--foreground)',
                  transition: 'all 0.2s ease'
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ fontSize: '1.025rem' }}>{opt}</span>
                
                {/* Selection indicator */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex-center justify-between gap-4" style={{ display: 'flex' }}>
          <button 
            className="btn" 
            disabled={currentQ === 0} 
            onClick={prevQuestion}
            style={{ 
              opacity: currentQ === 0 ? 0.4 : 1,
              cursor: currentQ === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Previous</span>
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {answers.map((answer: number, idx: number) => (
              <div
                key={idx}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: answer !== -1 ? 'var(--primary)' : 'var(--border)',
                  border: answer !== -1 ? '2px solid var(--primary)' : '2px solid var(--border)',
                  transition: 'all 0.2s ease',
                  boxShadow: answer !== -1 ? '0 0 10px var(--primary-glow)' : 'none'
                }}
              />
            ))}
          </div>

          {currentQ === totalQuestions - 1 ? (
            <button 
              className="btn btn-primary" 
              onClick={handleSubmit} 
              disabled={submitting || answers[currentQ] === -1}
              style={{ 
                opacity: answers[currentQ] === -1 ? 0.6 : 1,
                cursor: answers[currentQ] === -1 ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Quiz</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </>
              )}
            </button>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={nextQuestion}
              disabled={answers[currentQ] === -1}
              style={{ 
                opacity: answers[currentQ] === -1 ? 0.6 : 1,
                cursor: answers[currentQ] === -1 ? 'not-allowed' : 'pointer'
              }}
            >
              <span>Next</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </div>

        {/* Progress hint */}
        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            {answeredCount} of {totalQuestions} questions answered
          </p>
        </div>
      </div>
    </div>
  );
}

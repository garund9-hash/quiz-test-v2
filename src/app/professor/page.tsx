'use client';

import { useState } from 'react';
import { generateQuiz } from '@/actions/quiz';
import Link from 'next/link';

export default function ProfessorPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await generateQuiz(topic);
      if (result.success && result.data) {
        setCreatedPin(result.data.pin);
      } else {
        setError(result.error || 'Failed to generate quiz');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex-col items-center flex-center animate-fade" style={{ minHeight: '85vh', padding: '4rem 2rem 2rem' }}>
      {/* Back Link */}
      <div style={{ 
        position: 'absolute', 
        top: '2rem', 
        left: '2rem' 
      }}>
        <Link href="/" className="btn" style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back</span>
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-10 animate-slide-down">
        <div className="badge badge-primary mb-4" style={{ display: 'inline-flex' }}>
          <span>Educator Dashboard</span>
        </div>
        <h1 className="text-5xl mb-3 text-gradient-gold">Create AI Quiz</h1>
        <p className="text-lg" style={{ color: 'var(--foreground-muted)', maxWidth: '500px' }}>
          Enter any topic and let Gemini AI craft a thoughtful 4-choice quiz for your students.
        </p>
      </div>

      {/* Main Card */}
      <div className="glass-panel animate-slide-up" style={{ 
        width: '100%', 
        maxWidth: '540px',
        padding: '2.5rem'
      }}>
        {!createdPin ? (
          <form onSubmit={handleGenerate} className="flex-col gap-6">
            {/* Error State */}
            {error && (
              <div className="animate-scale" style={{ 
                padding: '1rem 1.25rem', 
                background: 'var(--error-bg)', 
                color: 'var(--error)', 
                borderRadius: '12px',
                fontSize: '0.9rem',
                border: '1px solid rgba(248, 113, 113, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Topic Input */}
            <div className="flex-col gap-3">
              <label htmlFor="topic" className="text-sm font-medium" style={{ color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Quiz Topic
              </label>
              <input
                id="topic"
                type="text"
                className="input-field"
                placeholder="e.g., JavaScript Arrays, French Revolution, Photosynthesis..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                autoFocus
                style={{ fontSize: '1.05rem' }}
              />
              <p className="text-xs" style={{ color: 'var(--foreground-muted)', fontStyle: 'italic' }}>
                💡 Tip: Be specific for better results. "World War II causes" works better than just "history"
              </p>
            </div>

            {/* Generate Button */}
            <button 
              type="submit" 
              className={`btn ${loading ? 'btn-disabled' : 'btn-primary'} btn-full`} 
              disabled={loading}
              style={{ 
                padding: '1.125rem', 
                fontSize: '1rem',
                marginTop: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                  <span>Generating with Gemini 2.5...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                  <span>Generate AI Quiz</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="flex-col items-center gap-8 animate-scale">
            {/* Success Icon */}
            <div className="animate-scale" style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--success-bg)',
              border: '2px solid var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px var(--success-bg)'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>

            <div className="text-center">
              <h2 className="text-3xl mb-2 text-gradient-gold">Quiz Created!</h2>
              <p className="text-base" style={{ color: 'var(--foreground-muted)' }}>
                Share this PIN with your learners to begin
              </p>
            </div>

            {/* PIN Display */}
            <div className="glass-panel animate-glow" style={{ 
              fontSize: '3rem', 
              fontWeight: 800, 
              padding: '1.75rem 3rem',
              minWidth: '240px',
              letterSpacing: '12px',
              color: 'var(--primary)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '2px solid var(--primary)',
              boxShadow: '0 0 60px var(--primary-glow)',
              fontFamily: 'var(--font-display)'
            }}>
              {createdPin}
            </div>

            {/* Action Buttons */}
            <div className="flex-col gap-3 w-full" style={{ display: 'flex', width: '100%' }}>
              <Link 
                href={`/quiz/${createdPin}/leaderboard`} 
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

              <button 
                className="btn btn-full" 
                onClick={() => { setCreatedPin(null); setTopic(''); }}
                style={{ 
                  padding: '1rem', 
                  fontSize: '1rem',
                  border: '1px solid var(--border)',
                  background: 'rgba(255, 255, 255, 0.03)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span>Create Another Quiz</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <div style={{
        position: 'fixed',
        top: '20%',
        right: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
        opacity: 0.3,
        pointerEvents: 'none',
        zIndex: 0
      }}></div>
    </div>
  );
}

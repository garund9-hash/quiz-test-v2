'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [pin, setPin] = useState('');
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 4) {
      router.push(`/quiz/${pin}`);
    } else {
      alert('PIN must be 4 digits');
    }
  };

  return (
    <div className="container flex-col items-center flex-center" style={{ minHeight: '100vh', padding: '5rem 2rem 3rem' }}>
      {/* Hero Section */}
      <div className="text-center mb-16 animate-slide-up" style={{ maxWidth: '800px' }}>
        <div className="badge badge-primary mb-6 animate-float" style={{ display: 'inline-flex' }}>
          <span style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%' }}></span>
          Powered by Gemini AI
        </div>
        
        <h1 className="text-6xl mb-6 text-gradient" style={{ marginBottom: '1.5rem' }}>
          Illuminate Your<br />
          <span style={{ fontStyle: 'italic', fontWeight: 400 }}>Knowledge</span>
        </h1>
        
        <p className="text-lg" style={{ color: 'var(--foreground-muted)', maxWidth: '580px', margin: '0 auto', lineHeight: '1.8' }}>
          Create intelligent quizzes in seconds with AI. Join live sessions, 
          challenge your understanding, and climb the leaderboard.
        </p>
      </div>

      {/* Main Cards */}
      <div className="flex-center gap-12 mb-16" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
        {/* Professor Card */}
        <div className="glass-card animate-slide-up animate-delay-1" style={{ 
          width: '360px', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative glow */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
            opacity: 0.5,
            pointerEvents: 'none'
          }}></div>
          
          <div className="text-center mb-8">
            <div className="text-6xl mb-6 animate-float">👩‍🏫</div>
            <h2 className="text-3xl mb-3 text-gradient-gold">For Educators</h2>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Transform any topic into an engaging 4-choice quiz instantly. 
              Share a simple PIN and watch your students learn.
            </p>
          </div>
          
          <Link href="/professor" className="btn btn-primary btn-full" style={{ marginTop: 'auto' }}>
            <span>Create Quiz</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>

        {/* Learner Card */}
        <div className="glass-card animate-slide-up animate-delay-2" style={{ 
          width: '360px', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative glow */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
            opacity: 0.5,
            pointerEvents: 'none'
          }}></div>
          
          <div className="text-center mb-8">
            <div className="text-6xl mb-6 animate-float" style={{ animationDelay: '0.5s' }}>👨‍🎓</div>
            <h2 className="text-3xl mb-3 text-gradient-rose">For Learners</h2>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Enter a PIN, test your knowledge, and compete in real-time. 
              See how you rank against others instantly.
            </p>
          </div>

          <form onSubmit={handleJoin} className="flex-col gap-4" style={{ marginTop: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field text-center text-2xl font-bold"
                placeholder="Enter PIN"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                required
                style={{ 
                  letterSpacing: '8px',
                  background: 'rgba(15, 20, 35, 0.8)',
                  fontWeight: 700
                }}
              />
              {/* PIN input glow effect */}
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60%',
                height: '2px',
                background: pin.length === 4 ? 'var(--primary)' : 'transparent',
                boxShadow: pin.length === 4 ? '0 0 20px var(--primary)' : 'none',
                transition: 'all 0.3s ease'
              }}></div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-accent btn-full"
              disabled={pin.length !== 4}
              style={{ opacity: pin.length !== 4 ? 0.5 : 1 }}
            >
              <span>Join Quiz</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Features Section */}
      <div className="animate-slide-up animate-delay-3" style={{ maxWidth: '900px', width: '100%' }}>
        <div className="divider"></div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '2rem',
          marginTop: '2rem'
        }}>
          <div className="flex-col items-center text-center">
            <div className="text-3xl mb-4">✨</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>AI-Powered</h3>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Gemini 2.5 Flash generates accurate, insightful questions on any topic
            </p>
          </div>
          
          <div className="flex-col items-center text-center">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Real-Time</h3>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Live leaderboard updates as students complete quizzes instantly
            </p>
          </div>
          
          <div className="flex-col items-center text-center">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Secure</h3>
            <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
              Server-side grading ensures answers never leak to clients
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-sm text-center animate-fade" style={{ color: 'var(--foreground-muted)', opacity: 0.6 }}>
        <p>Built with Next.js, Firebase & Gemini AI</p>
      </div>
    </div>
  );
}

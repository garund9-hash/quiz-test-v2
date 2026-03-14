'use client';

import { useEffect, useState, use } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

export default function LeaderboardPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = use(params);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to real-time updates for this PIN's leaderboard
    const q = query(
      collection(db, 'leaderboard'),
      where('pin', '==', pin)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort descending by score, ascending by submission time
      data.sort((a: any, b: any) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (a.submittedAt?.toMillis() || 0) - (b.submittedAt?.toMillis() || 0);
      });

      setLeaderboard(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pin]);

  // Get medal emoji for top 3
  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  // Get crown for first place
  const getCrown = (index: number) => {
    if (index === 0) return '👑';
    return null;
  };

  return (
    <div className="container flex-col items-center flex-center animate-fade" style={{ minHeight: '85vh', padding: '3rem 2rem 2rem' }}>
      {/* Header */}
      <div className="text-center mb-10 animate-slide-down">
        <div className="badge badge-accent mb-4" style={{ display: 'inline-flex' }}>
          <span style={{ width: '6px', height: '6px', background: 'var(--accent)', borderRadius: '50%', marginRight: '6px' }}></span>
          Live Rankings
        </div>
        <h1 className="text-5xl mb-3 text-gradient-rose">Leaderboard</h1>
        <p className="text-lg" style={{ color: 'var(--foreground-muted)' }}>
          Quiz PIN: <span style={{ 
            color: 'var(--primary)', 
            fontWeight: 700, 
            fontSize: '1.25rem',
            letterSpacing: '4px'
          }}>{pin}</span>
        </p>
      </div>

      {/* Leaderboard Card */}
      <div className="glass-panel" style={{ 
        width: '100%', 
        maxWidth: '640px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        {loading ? (
          <div className="flex-col items-center" style={{ display: 'flex', padding: '3rem 0' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', borderTopColor: 'var(--primary)' }}></div>
            <p className="mt-4 text-sm" style={{ color: 'var(--foreground-muted)' }}>Loading rankings...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex-col items-center" style={{ display: 'flex', padding: '3rem 0' }}>
            <div className="text-6xl mb-4 animate-float">⏳</div>
            <h3 className="text-xl mb-2" style={{ color: 'var(--foreground)', fontWeight: 600 }}>No Submissions Yet</h3>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--foreground-muted)', maxWidth: '300px' }}>
              Be the first to complete the quiz and claim the top spot!
            </p>
            <Link href={`/quiz/${pin}`} className="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
              <span>Join Quiz</span>
            </Link>
          </div>
        ) : (
          <div className="flex-col gap-3">
            {/* Top 3 Podium */}
            {leaderboard.slice(0, 3).map((entry, index) => {
              const medal = getMedal(index);
              const crown = getCrown(index);
              const heights = ['70px', '90px', '50px']; // 2nd, 1st, 3rd
              const order = [1, 0, 2]; // Display order: 2nd, 1st, 3rd
              const actualIndex = order[index];
              const actualEntry = leaderboard[actualIndex];
              
              if (!actualEntry) return null;
              
              const isWinner = actualIndex === 0;
              
              return (
                <div
                  key={actualEntry.id}
                  className="animate-slide-up"
                  style={{
                    animationDelay: `${actualIndex * 0.15}s`,
                    position: 'relative'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: isWinner ? '1.25rem 1.5rem' : '1rem 1.25rem',
                    background: isWinner 
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)'
                      : actualIndex === 1 
                        ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(148, 163, 184, 0.05) 100%)'
                        : actualIndex === 2
                          ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(234, 179, 8, 0.04) 100%)'
                          : 'rgba(255, 255, 255, 0.02)',
                    border: isWinner
                      ? '2px solid var(--primary)'
                      : actualIndex === 1
                        ? '2px solid rgba(148, 163, 184, 0.4)'
                        : actualIndex === 2
                          ? '2px solid rgba(234, 179, 8, 0.3)'
                          : '1px solid var(--border)',
                    borderRadius: '16px',
                    boxShadow: isWinner ? '0 0 40px var(--primary-glow)' : 'none',
                    transform: isWinner ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}>
                    {/* Rank */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: isWinner
                        ? 'var(--primary)'
                        : actualIndex === 1
                          ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
                          : actualIndex === 2
                            ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
                            : 'rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: isWinner ? '#000' : actualIndex <= 2 ? '#000' : 'var(--foreground)',
                      flexShrink: 0,
                      boxShadow: actualIndex <= 2 ? '0 4px 14px rgba(0, 0, 0, 0.2)' : 'none'
                    }}>
                      {medal || `#${actualIndex + 1}`}
                    </div>

                    {/* Crown for winner */}
                    {crown && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '1.5rem',
                        filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.5))',
                        animation: 'float 2s ease-in-out infinite'
                      }}>
                        {crown}
                      </div>
                    )}

                    {/* Nickname */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: isWinner ? '1.25rem' : '1.05rem',
                        fontWeight: isWinner ? 700 : 600,
                        color: isWinner ? 'var(--primary-light)' : 'var(--foreground)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {entry.nickname}
                      </div>
                      {isWinner && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          marginTop: '0.25rem'
                        }}>
                          🏆 Champion
                        </div>
                      )}
                    </div>

                    {/* Score */}
                    <div style={{
                      textAlign: 'right',
                      flexShrink: 0
                    }}>
                      <div style={{
                        fontSize: isWinner ? '1.75rem' : '1.25rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-display)',
                        color: isWinner
                          ? 'var(--primary)'
                          : actualIndex === 1
                            ? '#94a3b8'
                            : actualIndex === 2
                              ? '#eab308'
                              : 'var(--foreground)',
                        textShadow: isWinner ? '0 0 20px var(--primary-glow)' : 'none'
                      }}>
                        {entry.score}<span style={{ fontSize: '1rem', color: 'var(--foreground-muted)', fontWeight: 400 }}>/ {entry.total}</span>
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--foreground-muted)',
                        marginTop: '0.125rem'
                      }}>
                        {Math.round((entry.score / entry.total) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Rest of the leaderboard */}
            {leaderboard.slice(3).map((entry, index) => (
              <div
                key={entry.id}
                className="animate-slide-up"
                style={{
                  animationDelay: `${(index + 3) * 0.08}s`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Rank */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--foreground-muted)',
                  flexShrink: 0
                }}>
                  #{index + 4}
                </div>

                {/* Nickname */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    color: 'var(--foreground)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {entry.nickname}
                  </div>
                </div>

                {/* Score */}
                <div style={{
                  textAlign: 'right',
                  flexShrink: 0
                }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--foreground)'
                  }}>
                    {entry.score}<span style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)', fontWeight: 400 }}>/ {entry.total}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live indicator */}
      {leaderboard.length > 0 && (
        <div className="flex-center gap-3 mb-8 animate-fade" style={{ display: 'flex' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--success)',
            boxShadow: '0 0 12px var(--success)',
            animation: 'pulse 2s ease-in-out infinite'
          }}></div>
          <p className="text-sm" style={{ color: 'var(--success)', fontWeight: 500 }}>Updates in real-time</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex-center gap-4" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link 
          href={`/quiz/${pin}`} 
          className="btn"
          style={{ 
            border: '1px solid var(--border)',
            background: 'rgba(255, 255, 255, 0.03)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>Join Quiz</span>
        </Link>
        
        <Link 
          href="/" 
          className="btn"
          style={{ 
            border: '1px solid var(--border)',
            background: 'rgba(255, 255, 255, 0.03)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <span>Home</span>
        </Link>
      </div>
    </div>
  );
}

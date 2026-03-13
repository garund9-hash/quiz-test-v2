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

  return (
    <div className="container flex-col items-center flex-center animate-fade" style={{ minHeight: '80vh', padding: '2rem' }}>
      <div className="card w-full" style={{ maxWidth: '600px' }}>
        <h1 className="text-4xl mb-2 text-gradient text-center">Live Leaderboard</h1>
        <p className="text-sm mb-8 text-center">PIN: <span style={{color: 'var(--primary)', fontWeight: 'bold'}}>{pin}</span></p>

        {loading ? (
          <div className="text-center py-8">Loading real-time scores...</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-sm">
            No one has completed the quiz yet. Waiting for learners... 
            <div className="mt-4 animate-in" style={{ animationIterationCount: 'infinite', animationDuration: '2s' }}>⏳</div>
          </div>
        ) : (
          <div className="flex-col gap-4">
            {leaderboard.map((entry, index) => (
              <div 
                key={entry.id} 
                className="input-field animate-in flex-center justify-between" 
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  display: 'flex',
                  background: index === 0 ? 'rgba(236, 72, 153, 0.1)' : undefined,
                  borderColor: index === 0 ? 'var(--accent)' : undefined,
                  transform: index === 0 ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <div className="flex-center gap-4" style={{ display: 'flex' }}>
                  <span className="text-xl font-bold" style={{ width: '40px', color: index === 0 ? 'var(--accent)' : 'inherit' }}>
                    #{index + 1}
                  </span>
                  <span className="text-lg">{entry.nickname}</span>
                </div>
                <div className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
                  {entry.score} / {entry.total}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex-center mt-12 gap-4 flex-col" style={{ display: 'flex' }}>
          <p className="text-sm" style={{ color: 'var(--success)' }}>Updates in real-time!</p>
          <div className="flex-center gap-4" style={{ display: 'flex' }}>
            <Link href={`/quiz/${pin}`} className="btn" style={{ border: '1px solid var(--border)' }}>
              Join Quiz
            </Link>
            <Link href="/" className="btn" style={{ border: '1px solid var(--border)' }}>
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

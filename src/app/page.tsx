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
    <div className="container flex-col items-center flex-center animate-fade" style={{ minHeight: '100vh', padding: '4rem 2rem' }}>
      <div className="text-center mb-16">
        <h1 className="text-gradient mb-6" style={{ fontSize: '4.5rem', lineHeight: '1.1' }}>
          Educational AI Quiz
        </h1>
        <p className="text-xl" style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
          The premium educational quiz platform powered by Gemini AI and Firebase. 
          Generate insightful quizzes in seconds, learn together, and compete on the live leaderboard.
        </p>
      </div>

      <div className="flex-center gap-8" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div className="card text-center" style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
          <div className="text-6xl mb-6">👩‍🏫</div>
          <h2 className="text-2xl mb-4 text-gradient">For Professors</h2>
          <p className="text-sm mb-8 flex-1" style={{ color: '#cbd5e1' }}>
            Instantly generate 4-choice AI quizzes on any topic. Get a quick 4-digit PIN to share with your students.
          </p>
          <Link href="/professor" className="btn btn-primary w-full">
            Create a Quiz
          </Link>
        </div>

        <div className="card text-center" style={{ width: '320px', display: 'flex', flexDirection: 'column' }}>
          <div className="text-6xl mb-6">👨‍🎓</div>
          <h2 className="text-2xl mb-4 text-gradient">For Learners</h2>
          <p className="text-sm mb-8 flex-1" style={{ color: '#cbd5e1' }}>
            Join a live session using your professor's PIN. Take the quiz and compete on the real-time leaderboard!
          </p>
          
          <form className="flex-col gap-4" onSubmit={handleJoin}>
            <input 
              type="text" 
              className="input-field text-center text-xl font-bold" 
              placeholder="1234" 
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              required
              style={{ letterSpacing: '4px' }}
            />
            <button type="submit" className="btn btn-primary w-full">
              Join Quiz
            </button>
          </form>
        </div>
      </div>
      
      <div className="mt-20 text-sm text-center" style={{ color: '#64748b' }}>
        Built with Next.js, Firebase, and Gemini AI. Premium custom design.
      </div>
    </div>
  );
}

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
      if (result.success && result.pin) {
        setCreatedPin(result.pin);
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
    <div className="container flex-col items-center flex-center animate-fade" style={{ minHeight: '80vh' }}>
      <div className="card w-full" style={{ maxWidth: '500px' }}>
        <h1 className="text-4xl mb-2 text-gradient">Create AI Quiz</h1>
        <p className="text-sm mb-8">Enter a topic, and AI will generate a 4-choice quiz.</p>

        {error && (
          <div className="mb-6 p-4 text-sm" style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderRadius: '12px' }}>
            {error}
          </div>
        )}

        {!createdPin ? (
          <form onSubmit={handleGenerate} className="flex-col gap-6">
            <div className="flex-col gap-2">
              <label htmlFor="topic" className="text-sm">Quiz Topic</label>
              <input 
                id="topic"
                type="text" 
                className="input-field" 
                placeholder="e.g. JavaScript Arrays, French Revolution..." 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>
            
            <button type="submit" className={`btn ${loading ? 'btn-disabled' : 'btn-primary'}`} disabled={loading}>
              {loading ? 'Generating using Gemini-2.5...' : 'Generate AI Quiz'}
            </button>
            <Link href="/" className="btn text-center text-sm mt-4" style={{ color: 'var(--primary)' }}>
              &larr; Back to Home
            </Link>
          </form>
        ) : (
          <div className="flex-col items-center gap-6 animate-in">
            <div className="text-center">
              <h2 className="text-2xl mb-2 text-gradient">Quiz Created Successfully!</h2>
              <p className="text-sm">Share this PIN with your learners.</p>
            </div>
            
            <div className="glass-panel text-4xl p-6 font-bold flex-center" style={{ color: 'var(--success)', minWidth: '200px', letterSpacing: '4px' }}>
              {createdPin}
            </div>

            <Link href={`/quiz/${createdPin}/leaderboard`} className="btn btn-primary w-full text-center">
              View Leaderboard
            </Link>
            
            <button className="btn w-full" style={{ border: '1px solid var(--border)' }} onClick={() => { setCreatedPin(null); setTopic(''); }}>
              Create Another Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

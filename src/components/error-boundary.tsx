'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  public reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'var(--background)',
            color: 'var(--foreground)'
          }}
        >
          <div 
            style={{
              maxWidth: '500px',
              textAlign: 'center',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '2.5rem'
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
            
            <h1 
              style={{ 
                fontSize: '1.75rem', 
                fontWeight: 600,
                marginBottom: '0.75rem',
                fontFamily: 'var(--font-display)'
              }}
            >
              Something went wrong
            </h1>
            
            <p 
              style={{ 
                color: 'var(--foreground-muted)',
                marginBottom: '1.5rem',
                lineHeight: 1.6
              }}
            >
              We encountered an unexpected error. Don't worry, your progress is safe.
            </p>

            {this.state.error && (
              <details 
                style={{
                  textAlign: 'left',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem'
                }}
              >
                <summary 
                  style={{ 
                    cursor: 'pointer', 
                    fontWeight: 500,
                    marginBottom: '0.5rem',
                    color: 'var(--error)'
                  }}
                >
                  Error Details
                </summary>
                <code 
                  style={{ 
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--foreground-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem'
                  }}
                >
                  {this.state.error.toString()}
                </code>
              </details>
            )}
            
            <button
              onClick={this.reset}
              className="btn btn-primary"
              style={{
                padding: '0.875rem 2rem',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

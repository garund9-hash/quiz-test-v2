'use client';

import { useState, useEffect } from 'react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  message: string;
  onClose?: () => void;
  duration?: number;
}

/**
 * Alert component for displaying notifications
 */
export function Alert({ type, message, onClose, duration = 5000 }: AlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const icons = {
    success: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    error: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    warning: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    info: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    )
  };

  const styles = {
    success: {
      background: 'var(--success-bg)',
      border: '1px solid rgba(52, 211, 153, 0.3)',
      color: 'var(--success)'
    },
    error: {
      background: 'var(--error-bg)',
      border: '1px solid rgba(248, 113, 113, 0.3)',
      color: 'var(--error)'
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.15)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      color: 'var(--primary-light)'
    },
    info: {
      background: 'rgba(99, 102, 241, 0.15)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      color: '#a5b4fc'
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="animate-slide-down"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        fontSize: '0.9rem',
        fontWeight: 500,
        ...styles[type]
      }}
      role="alert"
    >
      <span style={{ flexShrink: 0 }}>{icons[type]}</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({ size = 'medium', text }: { size?: 'small' | 'medium' | 'large'; text?: string }) {
  const sizes = {
    small: { width: '16px', height: '16px', borderWidth: '2px' },
    medium: { width: '24px', height: '24px', borderWidth: '2.5px' },
    large: { width: '40px', height: '40px', borderWidth: '3px' }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <div
        className="spinner"
        style={{
          ...sizes[size],
          borderColor: 'var(--border)',
          borderTopColor: 'var(--primary)'
        }}
      />
      {text && (
        <span style={{ color: 'var(--foreground-muted)', fontSize: '0.875rem' }}>
          {text}
        </span>
      )}
    </div>
  );
}

/**
 * Full-page loading state
 */
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      className="container flex-center flex-col"
      style={{ minHeight: '80vh' }}
    >
      <LoadingSpinner size="large" text={message} />
    </div>
  );
}

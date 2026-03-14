/**
 * Security Event Logger
 * Provides secure logging for security-sensitive events
 * Hashes sensitive data to prevent information disclosure
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// Configuration
// ============================================================================

/** Fields that should always be hashed before logging */
const SENSITIVE_FIELDS = ['pin', 'userId', 'userIdHash', 'ipAddress', 'quizId', 'email'] as const;

type SensitiveField = (typeof SENSITIVE_FIELDS)[number];

// ============================================================================
// Types
// ============================================================================

export type SecurityEventType =
  | 'quiz_expired'
  | 'quiz_expired_unauthorized'
  | 'rate_limit_exceeded'
  | 'invalid_request'
  | 'cleanup_completed'
  | 'cleanup_failed'
  | 'cleanup_dry_run'
  | 'auth_failure'
  | 'data_access'
  | 'permission_denied'
  | 'suspicious_activity'
  | 'slow_operation';

export interface SecurityLogData {
  eventType: SecurityEventType;
  data: Record<string, unknown>;
  timestamp: Date;
  environment: string;
}

// ============================================================================
// Hashing Functions
// ============================================================================

/**
 * Simple hash function for sensitive data
 * Note: For production, consider using a more robust hashing library
 */
async function hashValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value + (process.env.SECURITY_SALT || 'default-salt'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

/**
 * Sanitize data by hashing sensitive fields
 */
async function sanitizeData(
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.includes(key as SensitiveField) && typeof value === 'string') {
      // Hash sensitive string values
      sanitized[`${key}Hash`] = await hashValue(value);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = await sanitizeData(value as Record<string, unknown>);
    } else {
      // Keep non-sensitive values as-is
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================================================
// Security Logger
// ============================================================================

/**
 * Log a security event to Firestore
 * Automatically hashes sensitive fields
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    // Sanitize data (hash sensitive fields)
    const sanitizedData = await sanitizeData(data);

    // Add metadata
    const logEntry = {
      eventType,
      data: sanitizedData,
      timestamp: serverTimestamp(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };

    // Store in Firestore (non-blocking)
    await addDoc(collection(db, 'security_logs'), logEntry);

    // In development, also log to console for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Security Event]', eventType, sanitizedData);
    }
  } catch (error) {
    // Never fail silently, but don't expose errors to callers
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Security Logger] Failed to log event:', errorMessage);
  }
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(
  resource: string,
  userId?: string,
  reason?: string
): Promise<void> {
  await logSecurityEvent('permission_denied', {
    resource,
    userId: userId || 'anonymous',
    reason: reason || 'unspecified'
  });
}

/**
 * Log rate limit violation
 */
export async function logRateLimitExceeded(
  action: string,
  identifier: string,
  limit: number
): Promise<void> {
  await logSecurityEvent('rate_limit_exceeded', {
    action,
    identifier,
    limit
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  activity: string,
  details: Record<string, unknown>
): Promise<void> {
  await logSecurityEvent('suspicious_activity', {
    activity,
    ...details
  });
}

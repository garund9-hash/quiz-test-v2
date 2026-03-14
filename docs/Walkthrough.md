# Code Walkthrough

**Project:** Educational AI Quiz Platform  
**Purpose:** Guide developers through the codebase architecture and implementation

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Core Components](#core-components)
3. [Data Flow](#data-flow)
4. [Security Architecture](#security-architecture)
5. [Key Implementation Details](#key-implementation-details)

---

## Project Structure

```
quiz-test-v2/
├── src/
│   ├── actions/              # Server Actions (application logic)
│   │   ├── quiz.ts          # Quiz generation with AI
│   │   └── grade.ts         # Quiz grading and retrieval
│   ├── app/                  # Next.js App Router pages
│   │   ├── professor/       # Professor dashboard
│   │   ├── quiz/[pin]/      # Quiz taking & leaderboard
│   │   ├── layout.tsx       # Root layout with ErrorBoundary
│   │   └── globals.css      # Design system
│   ├── components/           # Reusable React components
│   │   ├── error-boundary.tsx
│   │   └── ui-feedback.tsx
│   └── lib/                  # Infrastructure & utilities
│       ├── repositories/     # Data access layer
│       │   ├── quiz-repository.ts
│       │   └── score-repository.ts
│       ├── cache.ts          # Cache-Aside implementation
│       ├── circuit-breaker.ts
│       ├── rate-limiter.ts
│       ├── validators.ts     # Zod schemas
│       ├── pin-generator.ts
│       ├── ttl-manager.ts    # Quiz expiration
│       ├── security-logger.ts
│       ├── types.ts
│       └── firebase.ts
├── docs/                     # Documentation
│   ├── ADR.md               # Architecture decisions
│   ├── Walkthrough.md       # This file
│   └── Getting_started.md   # Quick start
├── firestore.indexes.json    # Firestore index configuration
└── README.md                 # Project overview
```

---

## Core Components

### 1. Server Actions (`src/actions/`)

Server Actions contain the application's business logic and are executed exclusively on the server.

#### `quiz.ts` - Quiz Generation

```typescript
// Flow: Validate → Rate Limit → Generate AI Content → Store
export async function generateQuiz(topic: string) {
  // 1. Validate input (Zod schema)
  const validatedTopic = validateTopicInput(topic);
  
  // 2. Check rate limit (prevent abuse)
  checkGenerationRateLimit(clientIp);
  
  // 3. Generate quiz with AI (circuit breaker protected)
  const questions = await generateQuizContentWithAI(validatedTopic);
  
  // 4. Create client-safe questions (no answers)
  const clientQuestions = createClientQuestions(questions);
  
  // 5. Generate unique PIN with collision detection
  const pin = await generateUniquePin(4);
  
  // 6. Store in Firestore via repository
  return await storeQuiz({ pin, topic, questions, clientQuestions });
}
```

#### `grade.ts` - Quiz Grading

```typescript
// Flow: Validate → Rate Limit → Fetch Quiz → Grade → Save Score
export async function submitQuizAnswers(pin, nickname, answers) {
  // 1. Validate all inputs
  const { pin, nickname, answers } = validateQuizInput(pin, nickname, answers);
  
  // 2. Check rate limit
  checkSubmissionRateLimit(clientIp);
  
  // 3. Fetch quiz (with caching)
  const quiz = await fetchQuiz(pin);
  
  // 4. Server-side grading (answers never sent to client!)
  const score = calculateScore(answers, quiz.questions);
  
  // 5. Save to leaderboard
  await saveScore({ quizId, pin, nickname, score });
  
  // 6. Invalidate leaderboard cache
  invalidateLeaderboardCache(pin);
}
```

---

### 2. Repository Layer (`src/lib/repositories/`)

Abstracts database operations behind interfaces for testability and maintainability.

#### QuizRepository

```typescript
interface QuizRepository {
  createQuiz(quiz: Omit<Quiz, 'id'>): Promise<OperationResult<string>>;
  findByPin(pin: string): Promise<OperationResult<Quiz>>;
  findActiveByPin(pin: string): Promise<OperationResult<Quiz>>;
  updateStatus(id: string, status: QuizStatus): Promise<OperationResult<void>>;
  deleteQuiz(id: string): Promise<OperationResult<void>>;
}

// Usage
const quizRepo = getQuizRepository();
const result = await quizRepo.findByPin(pin);
```

#### ScoreRepository

```typescript
interface ScoreRepository {
  createScore(score: Omit<ScoreEntry, 'id'>): Promise<OperationResult<string>>;
  findByPin(pin: string): Promise<OperationResult<ScoreEntry[]>>;
  deleteByQuizId(quizId: string): Promise<OperationResult<void>>;
}
```

---

### 3. Security Infrastructure (`src/lib/`)

#### Input Validation (`validators.ts`)

```typescript
const topicSchema = z.object({
  topic: z.string()
    .min(3, 'Topic must be at least 3 characters')
    .max(200, 'Topic must be less than 200 characters')
    .trim()
});

export function validateTopic(topic: string) {
  return topicSchema.safeParse({ topic });
}
```

#### Rate Limiting (`rate-limiter.ts`)

```typescript
// Token bucket algorithm
export class RateLimiter {
  enforceLimit(clientId: string): void {
    if (!this.tryConsume(clientId)) {
      throw new RateLimitExceededError('Rate limit exceeded', retryAfter);
    }
  }
}

// Presets for different operations
const RATE_LIMIT_PRESETS = {
  quizGeneration: { maxTokens: 5, millisecondsPerToken: 12 * ONE_MINUTE },
  quizSubmission: { maxTokens: 10, millisecondsPerToken: 6 * ONE_SECOND }
};
```

#### Circuit Breaker (`circuit-breaker.ts`)

```typescript
export class CircuitBreaker {
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.isExecutionAllowed()) {
      throw new CircuitOpenError(this.serviceName, this.getRetryAfter());
    }
    
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}
```

---

### 4. Performance Optimizations (`src/lib/ttl-manager.ts`)

#### Singleton Rate Limiters

```typescript
// Created once at module level
const EXPIRE_QUIZ_RATE_LIMITER = createRateLimiter('quizGeneration');

// Reused on every call (no object allocation)
EXPIRE_QUIZ_RATE_LIMITER.enforceLimit(`expire:${userId}`);
```

#### Debounced Cache Invalidation

```typescript
const cacheInvalidationQueue = new Map<string, NodeJS.Timeout>();

function debouncedInvalidateCache(pin: string): void {
  if (cacheInvalidationQueue.has(pin)) return; // Already scheduled
  
  setTimeout(() => {
    invalidateQuizCache(pin);
    invalidateLeaderboardCache(pin);
    cacheInvalidationQueue.delete(pin);
  }, 100);
}
```

#### Optimized Date Calculations

```typescript
// Before: 2 Date objects, redundant calculations
const now = new Date();
const expiry = new Date(expiresAt);

// After: Single timestamp, early returns
const differenceMs = expiresAt.getTime() - Date.now();
if (differenceMs <= 0) return { expired: true, milliseconds: 0, hours: 0, days: 0 };
```

---

## Data Flow

### Quiz Creation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Professor  │────▶│  /professor │────▶│ generateQuiz│
│  enters     │     │  page       │     │ (Server     │
│  topic      │     │             │     │  Action)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Display    │◀────│  Store in   │◀────│  Generate   │
│  PIN to     │     │  Firestore  │     │  AI Content │
│  Professor  │     │  (quizzes)  │     │  (Gemini)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Quiz Taking Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Learner    │────▶│  /quiz/[pin]│────▶│ getClientQuiz│
│  enters PIN │     │  page       │     │ (Server     │
│  & nickname │     │             │     │  Action)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Display    │◀────│  Return     │◀────│  Fetch from │
│  Questions  │     │  clientQuestions│ │  Cache/DB   │
│  (no answers)│    │  (no correctAnswer)│ │           │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Quiz Submission Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Learner    │────▶│  Submit     │────▶│ submitQuiz  │
│  selects    │     │  answers    │     │ Answers     │
│  answers    │     │             │     │ (Server     │
│             │     │             │     │  Action)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Display    │◀────│  Invalidate │◀────│  Server-side│
│  Score &    │     │  Leaderboard│     │  Grading    │
│  Leaderboard│     │  Cache      │     │  (answers   │
│             │     │             │     │   compared) │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  • No correct answers sent to client                     │
│  • Input sanitization in forms                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Network Layer                           │
│  • HTTPS only                                            │
│  • Rate limiting per IP                                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                Application Layer                         │
│  • Zod validation schemas                                │
│  • Server-side grading                                   │
│  • Authorization checks                                  │
│  • Circuit breaker protection                            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                             │
│  • Firestore security rules                              │
│  • Encrypted at rest                                     │
│  • Audit logging (hashed identifiers)                    │
└─────────────────────────────────────────────────────────┘
```

### Security Event Types

| Event Type | Trigger | Logged Data |
|------------|---------|-------------|
| `quiz_expired` | Quiz expiration | Hashed quizId, userId, reason |
| `rate_limit_exceeded` | Rate limit hit | Action, hashed identifier |
| `invalid_request` | Validation failure | Errors, action type |
| `permission_denied` | Unauthorized access | Resource, hashed userId |
| `slow_operation` | >500ms execution | Operation, duration |
| `cleanup_completed` | Cleanup job | Count, batch size |
| `cleanup_failed` | Cleanup error | Error message |

---

## Key Implementation Details

### 1. Unique PIN Generation with Collision Detection

```typescript
export async function generateUniquePin(
  length: number = 4,
  maxAttempts: number = 10
): Promise<string> {
  const attemptedPins = new Set<string>();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pin = generateRandomPin(length);
    
    if (attemptedPins.has(pin)) continue;
    attemptedPins.add(pin);

    const result = await quizRepo.findByPin(pin);
    if (!result.success) return pin; // Available!
  }

  // Fallback to longer PIN
  return generateUniquePin(length + 2, maxAttempts);
}
```

### 2. Cache-Aside Pattern

```typescript
async function fetchQuizWithCache(pin: string): Promise<OperationResult<Quiz>> {
  try {
    const quiz = await quizCacheAside.getOrFetch(
      `quiz:${pin}`,
      async () => await fetchQuizFromDatabase(pin),
      5 * 60 * 1000 // 5 minute TTL
    );
    return { success: true, data: quiz };
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      return { success: false, error: 'Service unavailable' };
    }
    throw error;
  }
}
```

### 3. Graceful Expiration with Grace Period

```typescript
export function isQuizExpired(
  expiresAt: Date | null,
  options: { strict?: boolean } = {}
): boolean {
  if (!expiresAt) return false;

  const now = Date.now();
  const expiryTime = expiresAt.getTime();

  // Non-strict: 5-minute grace period (better UX)
  if (!options.strict) {
    return now > expiryTime + EXPIRATION_GRACE_PERIOD_MS;
  }

  // Strict: exact check (security-critical)
  return now > expiryTime;
}
```

### 4. Batch Cleanup with Firestore

```typescript
export async function cleanupExpiredQuizzes(
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const { dryRun = false, batchSize = 100 } = options;

  const now = Timestamp.fromDate(new Date());
  const q = query(
    collection(db, 'quizzes'),
    where('status', '==', 'active'),
    where('expiresAt', '<=', now),
    limit(batchSize)
  );

  const snapshot = await getDocs(q);
  
  if (dryRun) {
    return { success: true, expiredCount: snapshot.size, errors: [] };
  }

  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { status: 'expired', expiredAt: serverTimestamp() });
  });
  await batch.commit();

  return { success: true, expiredCount: snapshot.size, errors: [] };
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// validators.test.ts
describe('validateTopic', () => {
  it('should reject topics shorter than 3 characters', () => {
    const result = validateTopic('AI');
    expect(result.success).toBe(false);
  });

  it('should accept valid topics', () => {
    const result = validateTopic('JavaScript Basics');
    expect(result.success).toBe(true);
  });
});

// ttl-manager.test.ts
describe('isQuizExpired', () => {
  it('should return false within grace period', () => {
    const justExpired = new Date(Date.now() - 4 * 60 * 1000); // 4 min ago
    expect(isQuizExpired(justExpired, { strict: false })).toBe(false);
  });

  it('should return true after grace period', () => {
    const expired = new Date(Date.now() - 6 * 60 * 1000); // 6 min ago
    expect(isQuizExpired(expired, { strict: false })).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('expireQuiz integration', () => {
  it('should expire quiz and log security event', async () => {
    const result = await expireQuiz('quiz-123', '1234', {
      userId: 'user-456',
      reason: 'manual'
    });

    expect(result.success).toBe(true);
    expect(logSecurityEvent).toHaveBeenCalledWith('quiz_expired', expect.anything());
  });
});
```

---

## Related Documentation

- [ADR.md](./ADR.md) - Architecture Decision Records
- [Getting_started.md](./Getting_started.md) - Quick start guide
- [README.md](../README.md) - Project overview

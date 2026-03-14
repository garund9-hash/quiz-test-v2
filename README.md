# Educational AI Quiz Platform

A premium educational quiz platform built with Next.js, Firebase, and Gemini AI. Features a robust architecture with enterprise-grade patterns for security, scalability, and reliability.

## Features

### Core Functionality
- **Professor Mode**: Generate high-quality 4-choice quizzes on any topic using Gemini 2.5 Flash
- **Learner Mode**: Join quizzes using a unique 4-digit PIN with collision detection
- **Secure Server-side Grading**: All grading happens on the server; correct answers are never sent to the client
- **Real-time Leaderboard**: Live rankings powered by Firestore snapshots with automatic cache invalidation

### Architecture Highlights
- **Input Validation**: Zod schemas for type-safe validation of all user inputs
- **Repository Pattern**: Abstracted data access layer for testability and maintainability
- **Rate Limiting**: Token bucket algorithm prevents abuse and controls API costs
- **Circuit Breaker**: Graceful degradation when external services (Gemini, Firebase) are unavailable
- **Cache-Aside**: In-memory caching reduces database load and improves response times
- **TTL Management**: Automatic quiz expiration (7 days default) with cleanup utilities
- **Error Boundaries**: React error boundaries for graceful error recovery

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **AI** | Google Generative AI (Gemini 2.5 Flash) |
| **Database** | Firebase Firestore |
| **Validation** | Zod |
| **Styling** | Vanilla CSS with CSS Variables |
| **Fonts** | Playfair Display, Geist Sans/Mono |

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Pages     │  │  Components │  │   Error Boundaries      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│                        Application Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Server Actions  │  │   Validators    │  │  Rate Limiter   │ │
│  │  (quiz.ts)      │  │   (Zod)         │  │  (Token Bucket) │ │
│  │  (grade.ts)     │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│                         Domain Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Circuit        │  │  Cache-Aside    │  │  TTL Manager    │ │
│  │  Breaker        │  │  (5min TTL)     │  │  (7 days)       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│                      Infrastructure Layer                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Quiz Repository │  │Score Repository │  │  PIN Generator  │ │
│  │  (Firestore)    │  │  (Firestore)    │  │  (Collision-free)││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ Firebase Adapter│  │  Gemini Adapter │                      │
│  └─────────────────┘  └─────────────────┘                      │
└────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── actions/              # Server Actions (application logic)
│   ├── quiz.ts          # Quiz generation with rate limiting & circuit breaker
│   └── grade.ts         # Quiz grading with validation & caching
├── app/                  # Next.js App Router pages
│   ├── professor/       # Professor dashboard
│   ├── quiz/[pin]/      # Quiz taking & leaderboard
│   ├── layout.tsx       # Root layout with ErrorBoundary
│   └── globals.css      # Design system & CSS variables
├── components/           # Reusable React components
│   ├── error-boundary.tsx
│   └── ui-feedback.tsx
└── lib/                  # Infrastructure & utilities
    ├── repositories/     # Data access layer
    │   ├── quiz-repository.ts
    │   └── score-repository.ts
    ├── cache.ts          # Cache-Aside implementation
    ├── circuit-breaker.ts
    ├── rate-limiter.ts
    ├── validators.ts     # Zod schemas
    ├── pin-generator.ts
    ├── ttl-manager.ts
    ├── types.ts
    └── firebase.ts
```

## Environment Setup

Create a `.env.local` file in the project root:

```env
# AI Configuration
GEMINI_API_KEY="your-gemini-api-key"

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="..."
```

## Running the Application

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

Navigate to `http://localhost:3000` to access the platform.

## Design Patterns Implemented

### 1. Repository Pattern
```typescript
// Abstract data access behind interfaces
const quizRepo = getQuizRepository();
const quiz = await quizRepo.findByPin(pin);
```

### 2. Validation Schema Pattern
```typescript
// Type-safe input validation
const validation = validateTopic(topic);
if (!validation.success) {
  return { success: false, error: validation.error.errors[0].message };
}
```

### 3. Rate Limiter (Token Bucket)
```typescript
// Prevent abuse with configurable rate limits
const rateLimiter = createRateLimiter('quizGeneration');
rateLimiter.check(ip); // Throws RateLimitError if exceeded
```

### 4. Circuit Breaker
```typescript
// Graceful degradation for external services
const result = await geminiCircuitBreaker.execute(async () => {
  return await generateContent(prompt);
});
```

### 5. Cache-Aside Pattern
```typescript
// Reduce database load with automatic caching
const quiz = await quizCacheAside.getOrFetch(
  `quiz:${pin}`,
  async () => await quizRepo.findByPin(pin),
  5 * 60 * 1000 // 5 minute TTL
);
```

### 6. TTL Management
```typescript
// Automatic expiration for quizzes
const expiresAt = calculateExpiryDate(); // 7 days default
const lifecycleInfo = getQuizLifecycleInfo(createdAt, expiresAt);
```

## Security Features

| Feature | Implementation |
|---------|----------------|
| **Server-side Grading** | Correct answers stored server-side only; client receives `clientQuestions` without answers |
| **API Key Protection** | Gemini API key in `.env.local`, never exposed to client |
| **Input Validation** | All inputs validated with Zod schemas before processing |
| **Rate Limiting** | Per-IP rate limits prevent brute force and API abuse |
| **PIN Collision Detection** | Unique PIN generation with database verification |
| **Quiz Expiration** | Automatic expiration prevents indefinite quiz access |

## API Rate Limits

| Operation | Limit | Window |
|-----------|-------|--------|
| Quiz Generation | 5 requests | per hour |
| Quiz Submission | 10 requests | per minute |
| Quiz Retrieval | 5 requests | per minute |
| Leaderboard Access | 10 requests | per minute |

## Quiz Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Created   │────▶│   Active    │────▶│ Expiring    │────▶│  Expired    │
│             │     │  (7 days)   │     │  (<24h)     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Archived   │
                    │  (manual)   │
                    └─────────────┘
```

## Error Handling

The platform implements comprehensive error handling:

1. **React Error Boundaries**: Catch and display UI errors gracefully
2. **Server Action Error Handling**: All errors caught and returned as `{ success: false, error: string }`
3. **Circuit Breaker Fallbacks**: Graceful degradation when services are unavailable
4. **User-Friendly Messages**: Technical errors translated to user-friendly messages

## Testing Recommendations

```typescript
// Example: Testing the repository pattern
import { FirestoreQuizRepository } from '@/lib/repositories/quiz-repository';

describe('QuizRepository', () => {
  it('should create and retrieve a quiz', async () => {
    const repo = new FirestoreQuizRepository();
    const result = await repo.createQuiz({
      pin: '1234',
      topic: 'Test Topic',
      questions: [],
      clientQuestions: [],
      createdAt: new Date(),
      expiresAt: new Date(),
      status: 'active'
    });
    
    expect(result.success).toBe(true);
  });
});
```

## Production Considerations

### Scaling
- **Cache**: Consider Redis for distributed caching in multi-instance deployments
- **Rate Limiting**: Use Redis-backed rate limiter for consistent limits across instances
- **Database**: Add Firestore indexes for PIN and status queries

### Monitoring
- Log circuit breaker state changes
- Track rate limit violations
- Monitor cache hit/miss ratios
- Set up alerts for Gemini API failures

### Cleanup Job
Set up a scheduled Cloud Function to clean expired quizzes:

```typescript
// Firebase Cloud Function (scheduled daily)
export const cleanupExpiredQuizzes = functions.pubsub
  .schedule('0 2 * * *') // 2 AM daily
  .onRun(async () => {
    await cleanupExpiredQuizzes();
  });
```

## Contributing

1. Follow the existing code structure
2. Add Zod validation for new inputs
3. Use repositories for database operations
4. Add appropriate rate limiting for new endpoints
5. Write descriptive commit messages

## License

MIT

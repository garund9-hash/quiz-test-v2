# Documentation Index

**Educational AI Quiz Platform** - Complete documentation hub

---

## 📚 Documentation Overview

Welcome to the Educational AI Quiz Platform documentation. This hub provides comprehensive guides for developers, users, and administrators.

---

## 🚀 Getting Started

New to the project? Start here:

### [Getting Started Guide](./Getting_started.md)

**For:** New users and developers  
**Time:** 5-10 minutes

Learn how to:
- Set up your development environment
- Configure Firebase and Google AI
- Run your first quiz
- Deploy to production

**Quick links:**
- [Prerequisites](./Getting_started.md#prerequisites)
- [Environment Setup](./Getting_started.md#step-3-set-up-environment-variables)
- [Firebase Configuration](./Getting_started.md#step-4-set-up-firebase)
- [Troubleshooting](./Getting_started.md#troubleshooting)

---

## 🏗️ Architecture Documentation

### [Architecture Decision Records (ADR)](./ADR.md)

**For:** Developers and architects  
**Time:** 20-30 minutes

Understand the key architectural decisions:

1. **Server-Side Grading** - Why answers never reach the client
2. **Repository Pattern** - Abstracting data access
3. **Security-First Design** - Input validation with Zod
4. **Rate Limiting** - Token bucket implementation
5. **Cache-Aside Pattern** - Reducing database load
6. **Circuit Breaker** - Handling external service failures
7. **TTL Management** - Automatic quiz expiration
8. **Security Logging** - Audit trails and compliance
9. **Performance Optimization** - Latency reduction strategies

**Includes:**
- Context and decisions
- Implementation examples
- Trade-offs and consequences

---

## 📖 Code Walkthrough

### [Walkthrough Guide](./Walkthrough.md)

**For:** Developers contributing to the codebase  
**Time:** 30-45 minutes

Deep dive into the codebase:

- **Project Structure** - File organization
- **Core Components** - Server Actions, Repositories, Utilities
- **Data Flow** - Quiz creation and submission flows
- **Security Architecture** - Defense in depth
- **Key Implementations** - PIN generation, caching, expiration

**Diagrams included:**
- Quiz creation flow
- Quiz taking flow
- Submission and grading flow
- Security layers

---

## 📋 Quick Reference

### Environment Variables

```env
# Required
GEMINI_API_KEY="your-gemini-api-key"
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="..."

# Optional
SECURITY_SALT="your-random-secret"
```

### Default Configuration

| Setting | Default | File |
|---------|---------|------|
| Quiz TTL | 7 days | `ttl-manager.ts` |
| Rate limit (generation) | 5/hour | `rate-limiter.ts` |
| Rate limit (submission) | 10/min | `rate-limiter.ts` |
| Cache TTL (quiz) | 5 min | `cache.ts` |
| Cache TTL (leaderboard) | 30 sec | `cache.ts` |
| Grace period | 5 min | `ttl-manager.ts` |

### Available Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # Code linting
```

### API Routes

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/professor` | Create quizzes |
| `/quiz/[pin]` | Take quiz |
| `/quiz/[pin]/leaderboard` | View rankings |

---

## 🔧 Development Resources

### File Structure

```
quiz-test-v2/
├── src/
│   ├── actions/          # Server Actions
│   │   ├── quiz.ts      # Quiz generation
│   │   └── grade.ts     # Quiz grading
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   └── lib/              # Utilities
│       ├── repositories/ # Data access
│       ├── cache.ts     # Caching
│       ├── validators.ts # Validation
│       └── ttl-manager.ts # Expiration
├── docs/                 # Documentation
├── firestore.indexes.json
└── README.md
```

### Key Files

| File | Purpose |
|------|---------|
| `src/actions/quiz.ts` | AI quiz generation |
| `src/actions/grade.ts` | Quiz grading logic |
| `src/lib/validators.ts` | Input validation schemas |
| `src/lib/ttl-manager.ts` | Quiz expiration |
| `src/lib/security-logger.ts` | Audit logging |
| `firestore.indexes.json` | Database indexes |

---

## 📚 Additional Resources

### External Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Zod Documentation](https://zod.dev/)

### Design Patterns

- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Cache-Aside Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside)

---

## 📞 Support

### Getting Help

- **Documentation:** You are here!
- **GitHub Issues:** Report bugs
- **Discussions:** Ask questions

### Documentation Feedback

Found an issue or have suggestions?
- Open a GitHub issue
- Submit a pull request
- Contact the development team

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.

---

**Last Updated:** March 2026  
**Documentation Version:** 1.0.0

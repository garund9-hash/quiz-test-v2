# Getting Started

**Educational AI Quiz Platform** - Create intelligent quizzes in seconds with AI

Welcome! This guide will help you get up and running with the Educational AI Quiz Platform in minutes.

---

## Quick Start (5 minutes)

### Prerequisites

Ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn** (comes with Node.js)
- **Firebase account** ([Create free account](https://firebase.google.com/))
- **Google AI API key** ([Get free key](https://makersuite.google.com/app/apikey))

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd quiz-test-v2
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your credentials:

```env
# Google AI (Gemini) API Key
# Get your key from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY="your-gemini-api-key-here"

# Firebase Configuration
# Get these from: Firebase Console > Project Settings > General > Your apps
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-ABC123XYZ"

# Optional: Security salt for hashing (generate random string)
SECURITY_SALT="your-random-secret-string-here"
```

### Step 4: Set Up Firebase

#### 4.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Enter project name and follow the wizard
4. Enable **Firestore Database**

#### 4.2 Register Web App

1. In Firebase Console, click **Add app** → **Web**
2. Register your app (name it "Quiz Platform")
3. Copy the `firebaseConfig` values to `.env.local`

#### 4.3 Create Firestore Indexes

The app requires composite indexes for efficient queries.

**Option A: Firebase Console (Manual)**

1. Go to **Firestore Database** → **Indexes** tab
2. Click **Add Index** for each:

| Collection | Fields | Order |
|------------|--------|-------|
| quizzes | status, expiresAt | Ascending, Ascending |
| quizzes | pin, status | Ascending, Ascending |
| leaderboard | pin, score | Ascending, Descending |
| leaderboard | pin, submittedAt | Ascending, Ascending |

**Option B: Firebase CLI (Automated)**

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy indexes
firebase deploy --only firestore:indexes
```

#### 4.4 Set Up Firestore Security Rules

In Firebase Console → **Firestore Database** → **Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Quizzes: Read-only for authenticated users
    match /quizzes/{quizId} {
      allow read: if true;
      allow write: if false; // Only via Server Actions
    }
    
    // Leaderboard: Read-only
    match /leaderboard/{entryId} {
      allow read: if true;
      allow write: if false; // Only via Server Actions
    }
    
    // Security logs: No client access
    match /security_logs/{logId} {
      allow read, write: if false;
    }
  }
}
```

### Step 5: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Using the Platform

### For Professors: Create a Quiz

1. Navigate to **/professor** or click "Create a Quiz"
2. Enter a topic (e.g., "JavaScript Arrays", "French Revolution")
3. Click **Generate AI Quiz**
4. Wait ~10 seconds for AI to generate questions
5. Copy the 4-digit PIN (e.g., `4827`)
6. Share the PIN with your students

### For Learners: Join a Quiz

1. On the home page, enter the 4-digit PIN
2. Enter your nickname
3. Click **Start Quiz**
4. Answer all questions
5. Click **Submit Quiz**
6. View your score and the live leaderboard!

### View Leaderboard

Navigate to `/quiz/[PIN]/leaderboard` to see real-time rankings.

Example: `http://localhost:3000/quiz/4827/leaderboard`

---

## Project Structure Overview

```
quiz-test-v2/
├── src/
│   ├── actions/          # Server-side logic (quiz generation, grading)
│   ├── app/              # Next.js pages (UI components)
│   ├── components/       # Reusable React components
│   └── lib/              # Utilities (validation, caching, security)
├── docs/                 # Documentation
├── .env.local            # Environment variables (create this)
└── package.json          # Dependencies
```

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (http://localhost:3000) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Troubleshooting

### "GEMINI_API_KEY not configured"

**Solution:** Ensure `.env.local` exists with a valid API key.

```env
GEMINI_API_KEY="your-actual-api-key"
```

Restart the dev server after changing `.env.local`.

### "Quiz not found"

**Possible causes:**
1. Incorrect PIN (must be exactly 4 digits)
2. Quiz expired (default: 7 days)
3. Firestore indexes not configured

**Solution:** Verify PIN and check Firebase Console for indexes.

### "Rate limit exceeded"

**Cause:** Too many requests in a short time.

**Limits:**
- Quiz generation: 5 per hour
- Quiz submission: 10 per minute

**Solution:** Wait and try again.

### Firestore Permission Denied

**Cause:** Security rules blocking writes.

**Solution:** Update Firestore rules as shown in [Step 4.4](#44-set-up-firestore-security-rules).

### Build Fails with TypeScript Errors

**Solution:** Run type checking:

```bash
npm run build
```

Fix any reported errors. Common issues:
- Missing environment variables
- Type mismatches in code

---

## Next Steps

### Learn More

- [Architecture Decision Records](./ADR.md) - Why we made key design choices
- [Code Walkthrough](./Walkthrough.md) - Deep dive into the codebase
- [README](../README.md) - Full project documentation

### Customize the Platform

1. **Styling:** Edit `src/app/globals.css` for theme colors
2. **Quiz Settings:** Modify `QUIZ_TTL_CONFIG` in `src/lib/ttl-manager.ts`
3. **Rate Limits:** Adjust presets in `src/lib/rate-limiter.ts`
4. **AI Model:** Change `GEMINI_MODEL` in `src/actions/quiz.ts`

### Deploy to Production

**Recommended platforms:**

1. **Vercel** (easiest for Next.js)
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify**
   ```bash
   npm install -g netlify-cli
   netlify deploy
   ```

3. **Google Cloud Run**
   - Build Docker image
   - Deploy to Cloud Run
   - Set environment variables

**Production checklist:**
- [ ] Set all environment variables
- [ ] Enable Firebase production mode
- [ ] Configure custom domain
- [ ] Set up monitoring (optional)
- [ ] Configure backup strategy (optional)

---

## Getting Help

### Documentation

- [Architecture Decision Records](./ADR.md)
- [Code Walkthrough](./Walkthrough.md)
- [README](../README.md)

### Common Issues

| Issue | Solution |
|-------|----------|
| Quiz generation fails | Check GEMINI_API_KEY is valid |
| Leaderboard not updating | Verify Firestore indexes are created |
| Slow performance | Check Firestore query performance |
| Security warnings | Review security-logger.ts implementation |

### Support Channels

- **GitHub Issues:** Report bugs and feature requests
- **Discussions:** Ask questions and share ideas
- **Email:** Contact the development team

---

## Quick Reference

### Environment Variables

```env
# Required
GEMINI_API_KEY="..."
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Optional
SECURITY_SALT="..."
```

### Default Configuration

| Setting | Default | Location |
|---------|---------|----------|
| Quiz TTL | 7 days | `ttl-manager.ts` |
| Rate limit (generation) | 5/hour | `rate-limiter.ts` |
| Rate limit (submission) | 10/minute | `rate-limiter.ts` |
| Cache TTL (quiz) | 5 minutes | `cache.ts` |
| Cache TTL (leaderboard) | 30 seconds | `cache.ts` |
| Grace period | 5 minutes | `ttl-manager.ts` |

### API Endpoints

| Route | Description |
|-------|-------------|
| `/` | Home page |
| `/professor` | Professor dashboard |
| `/quiz/[pin]` | Quiz taking page |
| `/quiz/[pin]/leaderboard` | Live leaderboard |

---

**Happy Quizzing! 🎓**

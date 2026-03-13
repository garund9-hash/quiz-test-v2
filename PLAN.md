# Implementation Plan: Educational AI Quiz Platform

## Goal Description
Build an Educational AI Quiz Platform using Next.js (App Router), Firebase (Firestore), and the Gemini API (gemini-2.5-flash).
The platform will serve two types of users:
1. **Professors**: Can generate 4-multiple-choice quizzes on any topic using the Gemini API.
2. **Learners**: Can join quizzes using a simple nickname, take the quiz, and see a real-time leaderboard.

## User Review Required
> [!IMPORTANT]
> - The Gemini API key will be kept exclusively in `.env.local` and used only in Server Actions to ensure it is never exposed to the client.
> - Following security best practices (based on previous project feedback), quiz correct answers will **not** be sent to the client. Grading will be performed securely on the server side.
> - As per guidelines, Tailwind CSS will be avoided in favor of Vanilla CSS for styling, ensuring a rich, modern, and dynamic aesthetic with premium colors and animations.
> Please review this plan and let me know if you approve so I can begin execution.

## Proposed Changes

### 1. Project Setup
- **Initialize Next.js App**: `npx create-next-app@latest ./` configured without Tailwind.
- **Environment Variables**: Create `.env.local` for Gemini API and Firebase configurations.
- **Firebase Initialization**: Set up Firebase Client SDK & Firebase Admin SDK for secure server-side operations.

### 2. Professor Features (`/professor`)
- **Quiz Generation UI**: A form to input topics/materials.
- **Server Action for Gemini API**: Securely calls `gemini-2.5-flash` to generate 4-choice questions in JSON format.
- **Database Storage**: Saves the generated quiz to Firestore, generating a unique Quiz PIN.

### 3. Learner Features (`/quiz/[pin]`)
- **Entry UI**: A simple nickname input form for authentication.
- **Quiz Interface**: Displays questions one by one or all at once, collecting user choices.
- **Secure Server-side Grading**: Submits choices to a Server Action which compares them against the hidden correct answers in Firestore.
- **Score Saving**: Stores the learner's score and nickname in Firestore.

### 4. Real-time Leaderboard (`/quiz/[pin]/leaderboard`)
- **Real-time Updates**: Uses Firebase Firestore's `onSnapshot` client-side to display live rankings of learners as they complete the quiz.
- **Premium Design**: Adds micro-animations for rank changes and modern typography.

## Implementation Checklist
- [ ] Initialize Next.js project and Vanilla CSS design system.
- [ ] Configure `firebase` and `firebase-admin` with environment variables.
- [ ] Implement Gemini AI Quiz Generation server action.
- [ ] Build Professor Quiz Creation Page.
- [ ] Build Learner Quiz Entry and Taking interfaces.
- [ ] Implement Secure Server-side Grading logic.
- [ ] Build Real-time Leaderboard using Firestore snapshots.
- [ ] Final UI Polish (Animations, Colors, Typography).
- [ ] Write `README.md`.

## Verification Plan
### Automated Tests
- N/A for this rapid prototype unless explicitly requested; will rely on Next.js build verification (`npm run build`).

### Manual Verification
1. Open the app and navigate to the Professor dashboard.
2. Generate a quiz about "JavaScript Basics" and observe the 4-choice questions returned.
3. Note the generated Quiz PIN.
4. Open an incognito window as a Learner, enter the PIN and a nickname.
5. Take the quiz, submit, and verify the correct score is calculated.
6. Verify the leaderboard updates in real-time in both tabs.
7. Inspect the browser network tab during quiz taking to ensure correct answers are *never* transmitted to the client.

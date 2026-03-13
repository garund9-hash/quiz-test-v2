# Educational AI Quiz Platform

A premium educational quiz platform built with Next.js, Firebase, and Gemini AI. 

## Features
- **Professor Mode**: Generate high-quality 4-choice quizzes on any topic using Gemini 2.5 Flash.
- **Learner Mode**: Join quizzes visually using a custom 4-digit PIN.
- **Secure Server-side Grading**: Firebase interactions and AI generation happen securely on Next.js server actions. Correct answers are never sent to the client.
- **Real-time Leaderboard**: See ranks update live using Firestore snapshots.
- **Premium Design System**: Developed using pure Vanilla CSS featuring glassmorphism, fluid animations, and a cohesive color palette. 

## Tech Stack
- **Framework**: Next.js App Router
- **AI**: `@google/generative-ai` (Gemini 2.5 Flash)
- **Database**: Firebase Firestore Client SDK securely run from Server Actions.
- **Styling**: Vanilla CSS (Global tokens and variables)

## Environment Setup
Ensure the following variables are present in `.env.local`:
```env
GEMINI_API_KEY="..."

NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="..."
```

## Running the app
```bash
npm run dev
```
Navigate to `http://localhost:3000` to interact with the platform.

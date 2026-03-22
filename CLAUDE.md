# SpeakSwap API — CLAUDE.md

## Stack

Express 5 + TypeScript + Prisma + Socket.io + JWT (jsonwebtoken + bcryptjs)

## Project Structure

```
speakswap-api/
├── prisma/schema.prisma       # Database schema (source of truth)
├── src/
│   ├── index.ts               # Express + Socket.io setup, route mounting
│   ├── controllers/           # Request handling, validation, HTTP responses
│   ├── services/              # Business logic, Prisma queries
│   ├── routes/                # Express Router definitions
│   ├── middlewares/auth.ts    # JWT verification middleware (sets req.userId)
│   ├── utils/prisma.ts        # PrismaClient singleton
│   └── types/                 # Shared TypeScript types
├── tsconfig.json
└── package.json
```

## Architecture Pattern

**Routes → Controllers → Services → Prisma**

- **Routes** (`*.routes.ts`): define endpoints, apply middleware
- **Controllers** (`*.controller.ts`): parse request, call service, send response
- **Services** (`*.service.ts`): business logic, database operations via Prisma
- Controllers never access Prisma directly

## Module System

- `tsconfig.json` uses `"module": "nodenext"`
- All relative imports **must** use `.js` extensions: `import foo from "./bar.js"`
- This applies even though source files are `.ts`

## Auth

- JWT middleware at `src/middlewares/auth.ts` verifies Bearer tokens
- On success, sets `req.userId` (string)
- JWT_SECRET comes from `.env`
- Backend issues JWTs directly (register/login endpoints)
- Tokens expire in 7 days

## Current Endpoints

| Method | Path                              | Auth | Description                                      |
|--------|-----------------------------------|------|--------------------------------------------------|
| GET    | `/health`                         | No   | Health check                                     |
| POST   | `/api/auth/register`              | No   | Register + 60 bonus credits                      |
| POST   | `/api/auth/login`                 | No   | Login, returns JWT                               |
| GET    | `/api/users/me`                   | Yes  | Current user profile                             |
| PUT    | `/api/users/me`                   | Yes  | Update profile (roleMode validated: learner/teacher) |
| GET    | `/api/users/teachers`             | Yes  | Search teachers (filters + cursor/limit pagination) |
| POST   | `/api/availabilities`             | Yes  | Create availability slot                         |
| GET    | `/api/availabilities/me`          | Yes  | List own availabilities                          |
| GET    | `/api/availabilities/teacher/:id` | Yes  | List teacher's availabilities                    |
| DELETE | `/api/availabilities/:id`         | Yes  | Delete own availability                          |
| POST   | `/api/bookings`                   | Yes  | Create booking (holds credits via escrow)        |
| GET    | `/api/bookings/me`                | Yes  | List own bookings (cursor/limit pagination)      |
| PATCH  | `/api/bookings/:id/accept`        | Yes  | Teacher accepts booking → creates session        |
| PATCH  | `/api/bookings/:id/reject`        | Yes  | Teacher rejects booking → refunds credits        |
| PATCH  | `/api/bookings/:id/cancel`        | Yes  | Cancel booking (>12h: refund, ≤12h: teacher gets credits + strike) |
| GET    | `/api/sessions/me`                | Yes  | List own sessions (cursor/limit pagination)      |
| GET    | `/api/sessions/:id`               | Yes  | Get session details                              |
| PATCH  | `/api/sessions/:id/start`         | Yes  | Mark session started (per participant)           |
| PATCH  | `/api/sessions/:id/end`           | Yes  | End session → release credits to teacher         |
| GET    | `/api/conversations`              | Yes  | List conversations (includes unread count)       |
| POST   | `/api/conversations`              | Yes  | Create/find conversation with another user       |
| GET    | `/api/conversations/:id/messages` | Yes  | Get messages (cursor/limit pagination)           |
| POST   | `/api/conversations/:id/messages` | Yes  | Send message                                     |
| PATCH  | `/api/conversations/:id/read`     | Yes  | Mark all messages from other user as read        |

### Pagination

List endpoints support cursor-based pagination via query params:
- `cursor` — ID of last item from previous page
- `limit` — items per page (default 20, max 100; messages default 50)

## Database Schema (Key Models)

- **User**: email, password, firstName, lastName, nativeLanguage, learningLanguages[], age?, hobbies[], roleMode, credits, reliabilityScore, strikeCount
- **Availability**: teacherId, startTimeUTC, endTimeUTC, durationMinutes, creditsAmount, isBooked
- **Booking**: studentId, teacherId, availabilityId, status (PENDING/CONFIRMED/REJECTED/CANCELLED), creditsAmount
- **Session**: bookingId, studentId, teacherId, scheduledStartUTC, scheduledEndUTC, durationMinutes, creditsAmount, status, teacherStartedAt?, studentStartedAt?, endedAt?
- **Conversation** / **Message**: real-time messaging between users, messages have `readAt` for read tracking
- **CreditTransaction**: userId, amount, type (SESSION_EARN/SESSION_SPEND/ESCROW_HOLD/ESCROW_RELEASE/ESCROW_REFUND/PURCHASE/REFUND/BONUS)

## Business Rules

- All dates/times in UTC
- 1 minute = 1 credit (based on scheduled duration)
- Credits use escrow: ESCROW_HOLD on booking → ESCROW_RELEASE or ESCROW_REFUND after session
- Late cancellation (≤12h): no refund to student, credits released to teacher, canceller gets a strike
- No-show detection: 10-minute grace period after scheduledStartUTC
- Auto-complete: sessions past scheduledEndUTC are auto-completed with credits released
- New users get 60 bonus credits (CreditTransaction type BONUS)
- Passwords hashed with bcryptjs (10 rounds)
- roleMode restricted to "learner" or "teacher"

## Commands

```bash
npm run dev          # Dev server with nodemon
npm run build        # Compile TypeScript
npm start            # Run compiled JS
npx prisma validate  # Validate schema
npx prisma migrate dev --name <name>  # Create + run migration
npx prisma generate  # Regenerate Prisma client
```

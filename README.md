# free-fitness

AI-powered macro and calorie tracker. Sign in with Clerk, set daily macro goals, log meals by photo (Gemini analyzes the image), and persist logs in PostgreSQL via Prisma.

## Quick start

**Prerequisites:** Node.js 20+, npm, a [PostgreSQL](https://www.postgresql.org/) database, a [Clerk](https://clerk.com/) application, and a [Google AI](https://aistudio.google.com/apikey) API key for Gemini.

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local in the project root (see Environment variables below)

# 3. Sync the database schema
npx prisma db push

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visitors are redirected to sign-in; after signing up or signing in you land on the dashboard.

**Production build:**

```bash
npm run build
npm start
```

## Environment variables

Create `.env.local` in the project root (loaded by Next.js and Prisma via `prisma.config.ts`):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/free_fitness`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (food image analysis) |
| `GEMINI_MODEL` | No | Model id (default: `gemini-3.5-flash`) |

Optional Clerk routing (defaults work if your app uses `/sign-in` and `/sign-up`):

- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`

## Repository layout

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Main dashboard: daily macro totals, meal list, goal editor, camera/upload for food scans |
| `app/actions.ts` | Server actions: user goals, daily logs, add/delete meals |
| `app/api/analyze-food/route.ts` | POST endpoint: sends meal photo to Gemini, returns macros JSON |
| `app/lib/prisma.ts` | Prisma client singleton (PostgreSQL via `@prisma/adapter-pg`) |
| `app/generated/prisma/` | Generated Prisma client (do not edit; regenerate with `npx prisma generate`) |
| `app/sign-in/`, `app/sign-up/` | Clerk auth pages |
| `app/layout.tsx` | Root layout, fonts, `ClerkProvider`, PWA metadata |
| `middleware.ts` | Clerk middleware; protects all routes except sign-in/sign-up |
| `prisma/schema.prisma` | `UserProfile` and `DailyLog` models |
| `prisma.config.ts` | Prisma 7 config; reads `DATABASE_URL` from `.env.local` |
| `public/` | Static assets and `manifest.json` (installable PWA) |

**Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Clerk auth, Prisma 7 + PostgreSQL, Google Gemini (`@google/genai`).

## How it works

1. **Auth** — Clerk handles sign-in/sign-up; `middleware.ts` requires a session for the app and API routes.
2. **Profile** — On first use, server actions create a `UserProfile` row keyed by Clerk `userId` with default macro targets.
3. **Logging** — Meals for a calendar day live in `DailyLog.meals` (JSON). The UI loads and updates them through `app/actions.ts`.
4. **AI scan** — Uploading or capturing a photo calls `/api/analyze-food`, which sends the image to Gemini and returns estimated calories, protein, carbs, and fats.

## Useful commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (hot reload) |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | ESLint |
| `npx prisma db push` | Apply schema to the database |
| `npx prisma generate` | Regenerate client into `app/generated/prisma` |
| `npx prisma studio` | Browse data in the browser |

## Troubleshooting

- **401 / redirect loop** — Check Clerk keys and that sign-in/sign-up URLs match your routes.
- **Database errors** — Confirm `DATABASE_URL`, run `npx prisma db push`, and ensure PostgreSQL is reachable.
- **Food scan fails** — Verify `GEMINI_API_KEY` and that the model name in `GEMINI_MODEL` is available to your API key.

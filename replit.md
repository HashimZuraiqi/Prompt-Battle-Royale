# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (`@workspace/integrations-openai-ai-server`)

## Application: Prompt Engineering Game ("Prompt Battle")

A Kahoot-style multiplayer game for prompt engineering sessions.
- Host creates a room with a code to share with participants
- Players join using the room code
- Host sets a category + task prompt for each round
- All participants write their best AI prompt
- AI (GPT) judges each submission, scoring 0-100 with feedback
- Live leaderboard tracks cumulative scores across rounds

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── prompt-game/        # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-openai-ai-server/  # OpenAI client (Replit AI Integrations)
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- `rooms` — game rooms (id, code, hostName, status, createdAt)
- `players` — participants (id, name, roomId, totalScore, joinedAt)
- `rounds` — game rounds (id, roomId, roundNumber, category, prompt, status, timeLimit, createdAt)
- `submissions` — player prompt submissions (id, roundId, playerId, promptText, score, feedback, rank, submittedAt)

## API Routes

All under `/api`:
- `POST /rooms` — create room
- `GET /rooms/:code` — get room with players and current round
- `POST /rooms/:code/start` — host starts the game
- `POST /rooms/:code/players` — join room
- `GET /rooms/:code/players` — list players
- `POST /rooms/:code/rounds` — host creates a round
- `GET /rooms/:code/rounds` — list rounds
- `GET /rooms/:code/rounds/current` — get current round with submissions
- `POST /rooms/:code/rounds/:roundId/close` — host closes submissions
- `POST /rooms/:code/rounds/:roundId/judge` — trigger AI judgment
- `POST /rooms/:code/rounds/:roundId/submissions` — player submits prompt
- `GET /rooms/:code/rounds/:roundId/submissions` — get submissions
- `GET /rooms/:code/leaderboard` — full leaderboard

## GDG PSUT Info Session edition

Restyled to match the GDG on Campus PSUT Info Session 2026 deck (dark grain background, Google-color glows, glass cards, Poppins + DM Sans).
- Challenge deck: `artifacts/prompt-game/src/lib/gdg-deck.ts` (GDG PSUT / Just for fun / General tracks). The host picks a card or hits "Surprise me"; played cards are tracked per room.
- GDG fact sheet: `artifacts/api-server/src/lib/gdgFacts.ts` is given to the AI challenge generator and the quality judge, so GDG rounds reward accurate details.
- Join links accept `?code=XXXXXX` to prefill the room code.

## Frontend Routes

- `/` — home/landing with Host/Join options
- `/host` — host setup (enter name, create room)
- `/host/room/:code` — host control panel
- `/join` — join with room code + player name
- `/play/:code` — player view (submit prompt, see results)
- `/leaderboard/:code` — full leaderboard

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all lib packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Codegen

Run: `pnpm --filter @workspace/api-spec run codegen`

This generates files such as React Query hooks and Zod schemas from `lib/api-spec/openapi.yaml`.

## AI Integration

Uses Replit AI Integrations for OpenAI access — no user API key needed. Charges billed to Replit credits.
- Server: `@workspace/integrations-openai-ai-server` (import `openai` client)
- AI judgment uses `gpt-5-mini` model to score and rank player prompt submissions

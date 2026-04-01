#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Remove duplicate submissions (same player, same round) keeping only the earliest one
# Must run before adding the unique constraint
psql "$DATABASE_URL" -c "
  DELETE FROM submissions
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM submissions
    GROUP BY round_id, player_id
  );
" 2>/dev/null || true

# Add unique constraint idempotently (safe to run multiple times)
psql "$DATABASE_URL" -c "
  ALTER TABLE submissions
    ADD CONSTRAINT submissions_round_player_unique UNIQUE (round_id, player_id);
" 2>/dev/null || true

import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { roundsTable } from "./rounds";
import { playersTable } from "./players";

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull().references(() => roundsTable.id),
  playerId: integer("player_id").notNull().references(() => playersTable.id),
  promptText: text("prompt_text").notNull(),
  score: integer("score"),
  feedback: text("feedback"),
  rank: integer("rank"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("submissions_round_player_unique").on(t.roundId, t.playerId),
]);

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ id: true, submittedAt: true, score: true, feedback: true, rank: true });
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;

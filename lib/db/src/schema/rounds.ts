import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { roomsTable } from "./rooms";

export const roundsTable = pgTable("rounds", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => roomsTable.id),
  roundNumber: integer("round_number").notNull().default(1),
  category: text("category").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("open"),
  timeLimit: integer("time_limit").notNull().default(120),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoundSchema = createInsertSchema(roundsTable).omit({ id: true, createdAt: true });
export type InsertRound = z.infer<typeof insertRoundSchema>;
export type Round = typeof roundsTable.$inferSelect;

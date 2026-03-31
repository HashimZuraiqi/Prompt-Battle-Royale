import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, roomsTable, playersTable, roundsTable, submissionsTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/rooms/:code/rounds/:roundId/submissions", async (req, res): Promise<void> => {
  const rawRoundId = Array.isArray(req.params.roundId)
    ? req.params.roundId[0]
    : req.params.roundId;
  const roundId = parseInt(rawRoundId, 10);
  const { code } = req.params;
  const { playerId, promptText } = req.body;

  if (!playerId || promptText == null) {
    res.status(400).json({ error: "playerId and promptText are required" });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const [round] = await db
    .select()
    .from(roundsTable)
    .where(and(eq(roundsTable.id, roundId), eq(roundsTable.roomId, room.id)));

  if (!round) {
    res.status(404).json({ error: "Round not found" });
    return;
  }

  if (round.status !== "open") {
    res.status(400).json({ error: "Round is not accepting submissions" });
    return;
  }

  const existing = await db
    .select()
    .from(submissionsTable)
    .where(
      and(eq(submissionsTable.roundId, roundId), eq(submissionsTable.playerId, playerId))
    );

  if (existing.length > 0) {
    res.status(409).json({ error: "You have already submitted for this round" });
    return;
  }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, playerId));
  if (!player || player.roomId !== room.id) {
    res.status(403).json({ error: "Player not in this room" });
    return;
  }

  const [submission] = await db
    .insert(submissionsTable)
    .values({ roundId, playerId, promptText })
    .returning();

  res.status(201).json({
    id: submission.id,
    roundId: submission.roundId,
    playerId: submission.playerId,
    playerName: player.name,
    promptText: submission.promptText,
    score: submission.score,
    feedback: submission.feedback,
    rank: submission.rank,
    submittedAt: submission.submittedAt,
  });
});

router.get("/rooms/:code/rounds/:roundId/submissions", async (req, res): Promise<void> => {
  const rawRoundId = Array.isArray(req.params.roundId)
    ? req.params.roundId[0]
    : req.params.roundId;
  const roundId = parseInt(rawRoundId, 10);
  const { code } = req.params;

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const submissions = await db
    .select({
      id: submissionsTable.id,
      roundId: submissionsTable.roundId,
      playerId: submissionsTable.playerId,
      playerName: playersTable.name,
      promptText: submissionsTable.promptText,
      score: submissionsTable.score,
      feedback: submissionsTable.feedback,
      rank: submissionsTable.rank,
      submittedAt: submissionsTable.submittedAt,
    })
    .from(submissionsTable)
    .innerJoin(playersTable, eq(submissionsTable.playerId, playersTable.id))
    .where(eq(submissionsTable.roundId, roundId));

  res.json(submissions);
});

export default router;

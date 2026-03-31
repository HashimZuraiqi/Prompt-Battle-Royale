import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, roomsTable, playersTable, roundsTable, submissionsTable } from "@workspace/db";
import { generateRoomCode } from "../../lib/roomCode";

const router: IRouter = Router();

router.post("/rooms", async (req, res): Promise<void> => {
  const { hostName } = req.body;
  if (!hostName) {
    res.status(400).json({ error: "hostName is required" });
    return;
  }

  let code = generateRoomCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
    if (existing.length === 0) break;
    code = generateRoomCode();
    attempts++;
  }

  const [room] = await db
    .insert(roomsTable)
    .values({ code, hostName, status: "waiting" })
    .returning();

  res.status(201).json({
    id: room.id,
    code: room.code,
    hostName: room.hostName,
    status: room.status,
    createdAt: room.createdAt,
  });
});

router.get("/rooms/:code", async (req, res): Promise<void> => {
  const { code } = req.params;
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.roomId, room.id))
    .orderBy(desc(playersTable.totalScore));

  const currentRoundRows = await db
    .select()
    .from(roundsTable)
    .where(and(eq(roundsTable.roomId, room.id)))
    .orderBy(desc(roundsTable.roundNumber))
    .limit(1);

  let currentRound = null;
  if (currentRoundRows.length > 0) {
    const round = currentRoundRows[0];
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
      .where(eq(submissionsTable.roundId, round.id));

    currentRound = {
      ...round,
      submissions,
    };
  }

  res.json({
    id: room.id,
    code: room.code,
    hostName: room.hostName,
    status: room.status,
    createdAt: room.createdAt,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      roomId: p.roomId,
      totalScore: p.totalScore,
      joinedAt: p.joinedAt,
    })),
    currentRound,
  });
});

router.post("/rooms/:code/start", async (req, res): Promise<void> => {
  const { code } = req.params;
  const { hostName } = req.body;

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.hostName !== hostName) {
    res.status(403).json({ error: "Only the host can start the game" });
    return;
  }

  const [updated] = await db
    .update(roomsTable)
    .set({ status: "active" })
    .where(eq(roomsTable.id, room.id))
    .returning();

  res.json({
    id: updated.id,
    code: updated.code,
    hostName: updated.hostName,
    status: updated.status,
    createdAt: updated.createdAt,
  });
});

export default router;

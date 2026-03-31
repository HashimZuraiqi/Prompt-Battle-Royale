import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, roomsTable, playersTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/rooms/:code/players", async (req, res): Promise<void> => {
  const { code } = req.params;
  const { playerName } = req.body;

  if (!playerName) {
    res.status(400).json({ error: "playerName is required" });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  if (room.status === "finished") {
    res.status(400).json({ error: "Game has already finished" });
    return;
  }

  const [player] = await db
    .insert(playersTable)
    .values({ name: playerName, roomId: room.id })
    .returning();

  res.status(201).json({
    id: player.id,
    name: player.name,
    roomId: player.roomId,
    totalScore: player.totalScore,
    joinedAt: player.joinedAt,
  });
});

router.get("/rooms/:code/players", async (req, res): Promise<void> => {
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
    .orderBy(playersTable.joinedAt);

  res.json(
    players.map((p) => ({
      id: p.id,
      name: p.name,
      roomId: p.roomId,
      totalScore: p.totalScore,
      joinedAt: p.joinedAt,
    }))
  );
});

export default router;

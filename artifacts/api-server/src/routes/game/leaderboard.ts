import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, roomsTable, playersTable, submissionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/rooms/:code/leaderboard", async (req, res): Promise<void> => {
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

  const leaderboard = await Promise.all(
    players.map(async (player, index) => {
      const allSubmissions = await db
        .select()
        .from(submissionsTable)
        .where(eq(submissionsTable.playerId, player.id));

      const roundsWon = allSubmissions.filter((s) => s.rank === 1).length;

      return {
        playerId: player.id,
        playerName: player.name,
        totalScore: player.totalScore,
        roundsWon,
        rank: index + 1,
      };
    })
  );

  res.json({
    roomCode: code,
    players: leaderboard,
  });
});

export default router;

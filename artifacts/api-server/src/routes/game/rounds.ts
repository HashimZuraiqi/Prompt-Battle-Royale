import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, roomsTable, playersTable, roundsTable, submissionsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.get("/rooms/:code/rounds", async (req, res): Promise<void> => {
  const { code } = req.params;
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const rounds = await db
    .select()
    .from(roundsTable)
    .where(eq(roundsTable.roomId, room.id))
    .orderBy(roundsTable.roundNumber);

  res.json(
    rounds.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      roundNumber: r.roundNumber,
      category: r.category,
      prompt: r.prompt,
      status: r.status,
      timeLimit: r.timeLimit,
      createdAt: r.createdAt,
    }))
  );
});

router.post("/rooms/:code/rounds", async (req, res): Promise<void> => {
  const { code } = req.params;
  const { hostName, category, prompt, timeLimit = 120 } = req.body;

  if (!hostName || !category || !prompt) {
    res.status(400).json({ error: "hostName, category, and prompt are required" });
    return;
  }

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.hostName !== hostName) {
    res.status(403).json({ error: "Only the host can start a round" });
    return;
  }

  const existingRounds = await db
    .select()
    .from(roundsTable)
    .where(eq(roundsTable.roomId, room.id));

  const roundNumber = existingRounds.length + 1;

  const [round] = await db
    .insert(roundsTable)
    .values({
      roomId: room.id,
      roundNumber,
      category,
      prompt,
      status: "open",
      timeLimit,
    })
    .returning();

  res.status(201).json({
    id: round.id,
    roomId: round.roomId,
    roundNumber: round.roundNumber,
    category: round.category,
    prompt: round.prompt,
    status: round.status,
    timeLimit: round.timeLimit,
    createdAt: round.createdAt,
  });
});

router.get("/rooms/:code/rounds/current", async (req, res): Promise<void> => {
  const { code } = req.params;
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  const [round] = await db
    .select()
    .from(roundsTable)
    .where(eq(roundsTable.roomId, room.id))
    .orderBy(desc(roundsTable.roundNumber))
    .limit(1);

  if (!round) {
    res.status(404).json({ error: "No active round" });
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
    .where(eq(submissionsTable.roundId, round.id));

  res.json({
    id: round.id,
    roomId: round.roomId,
    roundNumber: round.roundNumber,
    category: round.category,
    prompt: round.prompt,
    status: round.status,
    timeLimit: round.timeLimit,
    createdAt: round.createdAt,
    submissions,
  });
});

router.post("/rooms/:code/rounds/:roundId/close", async (req, res): Promise<void> => {
  const rawRoundId = Array.isArray(req.params.roundId)
    ? req.params.roundId[0]
    : req.params.roundId;
  const roundId = parseInt(rawRoundId, 10);
  const { code } = req.params;
  const { hostName } = req.body;

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.hostName !== hostName) {
    res.status(403).json({ error: "Only the host can close a round" });
    return;
  }

  const [round] = await db
    .update(roundsTable)
    .set({ status: "closed" })
    .where(and(eq(roundsTable.id, roundId), eq(roundsTable.roomId, room.id)))
    .returning();

  if (!round) {
    res.status(404).json({ error: "Round not found" });
    return;
  }

  res.json({
    id: round.id,
    roomId: round.roomId,
    roundNumber: round.roundNumber,
    category: round.category,
    prompt: round.prompt,
    status: round.status,
    timeLimit: round.timeLimit,
    createdAt: round.createdAt,
  });
});

router.post("/rooms/:code/rounds/:roundId/judge", async (req, res): Promise<void> => {
  const rawRoundId = Array.isArray(req.params.roundId)
    ? req.params.roundId[0]
    : req.params.roundId;
  const roundId = parseInt(rawRoundId, 10);
  const { code } = req.params;
  const { hostName } = req.body;

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.code, code));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  if (room.hostName !== hostName) {
    res.status(403).json({ error: "Only the host can trigger judgment" });
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

  const submissionRows = await db
    .select({
      id: submissionsTable.id,
      playerId: submissionsTable.playerId,
      playerName: playersTable.name,
      promptText: submissionsTable.promptText,
    })
    .from(submissionsTable)
    .innerJoin(playersTable, eq(submissionsTable.playerId, playersTable.id))
    .where(eq(submissionsTable.roundId, roundId));

  if (submissionRows.length === 0) {
    res.status(400).json({ error: "No submissions to judge" });
    return;
  }

  const submissionsText = submissionRows
    .map((s, i) => `Submission ${i + 1} by ${s.playerName}:\n"${s.promptText}"`)
    .join("\n\n");

  const aiPrompt = `You are an expert prompt engineer judging a prompt engineering competition.

The task/category was: "${round.category}"
The challenge prompt was: "${round.prompt}"

Here are the participant submissions:

${submissionsText}

Please evaluate each submission and assign:
1. A score from 0-100 based on: clarity, specificity, creativity, effectiveness for the given task, and prompt engineering best practices (role assignment, context, output format, constraints).
2. Brief feedback (1-2 sentences) explaining the score.
3. A ranking (1 = best).

Respond with ONLY a valid JSON array in this exact format:
[
  {
    "playerName": "exact name from submission",
    "score": 85,
    "feedback": "Brief feedback here",
    "rank": 1
  }
]

Be fair but critical. Differentiate scores meaningfully. The best prompt should score 85-100, average prompts 50-70, poor prompts below 50.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 2000,
    messages: [{ role: "user", content: aiPrompt }],
  });

  const responseText = completion.choices[0]?.message?.content ?? "[]";

  let judgments: Array<{
    playerName: string;
    score: number;
    feedback: string;
    rank: number;
  }> = [];

  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      judgments = JSON.parse(jsonMatch[0]);
    }
  } catch {
    req.log.error({ responseText }, "Failed to parse AI judgment response");
    res.status(500).json({ error: "Failed to parse AI judgment" });
    return;
  }

  for (const submission of submissionRows) {
    const judgment = judgments.find(
      (j) => j.playerName === submission.playerName
    );
    if (judgment) {
      await db
        .update(submissionsTable)
        .set({
          score: judgment.score,
          feedback: judgment.feedback,
          rank: judgment.rank,
        })
        .where(eq(submissionsTable.id, submission.id));

      await db
        .update(playersTable)
        .set({
          totalScore: db.$count(submissionsTable, eq(submissionsTable.playerId, submission.playerId)),
        })
        .where(eq(playersTable.id, submission.playerId));
    }
  }

  const allPlayerScores: Record<number, number> = {};
  for (const submission of submissionRows) {
    const judgment = judgments.find((j) => j.playerName === submission.playerName);
    if (judgment) {
      allPlayerScores[submission.playerId] = (allPlayerScores[submission.playerId] ?? 0) + judgment.score;
    }
  }

  for (const [playerIdStr, addedScore] of Object.entries(allPlayerScores)) {
    const pId = parseInt(playerIdStr, 10);
    const [currentPlayer] = await db.select().from(playersTable).where(eq(playersTable.id, pId));
    if (currentPlayer) {
      await db
        .update(playersTable)
        .set({ totalScore: currentPlayer.totalScore + addedScore })
        .where(eq(playersTable.id, pId));
    }
  }

  await db
    .update(roundsTable)
    .set({ status: "judged" })
    .where(eq(roundsTable.id, roundId));

  const updatedSubmissions = await db
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
    .where(eq(submissionsTable.roundId, roundId))
    .orderBy(submissionsTable.rank);

  const summary = `AI has judged ${submissionRows.length} prompts for the "${round.category}" challenge.`;

  res.json({
    roundId,
    submissions: updatedSubmissions,
    summary,
  });
});

export default router;

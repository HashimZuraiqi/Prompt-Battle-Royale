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

  const BATCH_SIZE = 15;

  const buildJudgePrompt = (
    batch: typeof submissionRows,
    category: string,
    challenge: string
  ) => {
    const submissionsText = batch
      .map((s, i) => `Submission ${i + 1} by ${s.playerName}:\n"${s.promptText}"`)
      .join("\n\n");

    return `You are an expert prompt engineer judging a prompt engineering competition.

The category/persona for this round is: "${category}"
The challenge task is: "${challenge}"

Here are the participant submissions:

${submissionsText}

JUDGING RULES — apply strictly in this order:

1. RELEVANCE CHECK (non-negotiable): Does the submission actually address the category "${category}" AND the task "${challenge}"? If a submission is off-topic, unrelated, nonsensical, or clearly ignores the category/task, assign a score of 0–15 and explain why it missed the mark. Do not reward off-topic submissions just because they are well-written.

2. QUALITY SCORING (for on-topic submissions): Score 0–100 based on:
   - Relevance & adherence to the category and task (30 pts)
   - Clarity and specificity (20 pts)
   - Creativity and originality (20 pts)
   - Prompt engineering technique: role-setting, context, output format, constraints (30 pts)

3. FEEDBACK: 1–2 sentences. If off-topic, clearly state it. If on-topic, be specific about what worked and what could improve.

Respond with ONLY a valid JSON array (no markdown, no text outside the array):
[
  {
    "playerName": "exact name from submission",
    "score": 85,
    "feedback": "Brief feedback here"
  }
]

Be strict and fair. Differentiate scores meaningfully. Never give a high score to an irrelevant submission.`;
  };

  type RawJudgment = { playerName: string; score: number; feedback: string };

  const chunks: (typeof submissionRows)[] = [];
  for (let i = 0; i < submissionRows.length; i += BATCH_SIZE) {
    chunks.push(submissionRows.slice(i, i + BATCH_SIZE));
  }

  const batchResults = await Promise.all(
    chunks.map(async (batch) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 1500,
        messages: [{ role: "user", content: buildJudgePrompt(batch, round.category, round.prompt) }],
      });
      const text = completion.choices[0]?.message?.content ?? "[]";
      try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]) as RawJudgment[];
      } catch {
        req.log.error({ text }, "Failed to parse batch AI judgment");
      }
      return [] as RawJudgment[];
    })
  );

  const rawJudgments: RawJudgment[] = batchResults.flat();

  const sortedByScore = [...rawJudgments].sort((a, b) => b.score - a.score);
  const judgments = sortedByScore.map((j, i) => ({ ...j, rank: i + 1 }));

  await Promise.all(
    submissionRows.map(async (submission) => {
      const judgment = judgments.find((j) => j.playerName === submission.playerName);
      if (judgment) {
        await db
          .update(submissionsTable)
          .set({ score: judgment.score, feedback: judgment.feedback, rank: judgment.rank })
          .where(eq(submissionsTable.id, submission.id));
      }
    })
  );

  const scoreByPlayer: Record<number, number> = {};
  for (const submission of submissionRows) {
    const judgment = judgments.find((j) => j.playerName === submission.playerName);
    if (judgment) {
      scoreByPlayer[submission.playerId] = (scoreByPlayer[submission.playerId] ?? 0) + judgment.score;
    }
  }

  await Promise.all(
    Object.entries(scoreByPlayer).map(async ([playerIdStr, addedScore]) => {
      const pId = parseInt(playerIdStr, 10);
      const [current] = await db.select().from(playersTable).where(eq(playersTable.id, pId));
      if (current) {
        await db
          .update(playersTable)
          .set({ totalScore: current.totalScore + addedScore })
          .where(eq(playersTable.id, pId));
      }
    })
  );

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

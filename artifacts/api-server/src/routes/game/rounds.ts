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
  type RawJudgment = { playerName: string; score: number; feedback: string };

  // ── PASS 1: Relevance gate ──────────────────────────────────────────────
  // Ask the AI a single binary question per submission: is it on-topic?
  // This is a separate call so quality cannot "bleed into" the relevance verdict.

  const buildRelevancePrompt = (
    batch: typeof submissionRows,
    category: string,
    challenge: string
  ) => {
    const submissionsText = batch
      .map((s, i) => `Submission ${i + 1} by ${s.playerName}:\n"${s.promptText}"`)
      .join("\n\n");

    return `You are a relevance checker for a prompt engineering competition.

The challenge asks participants to produce something SPECIFIC:
- Category / Persona: "${category}"
- Task: "${challenge}"

Your only job is to decide whether each submission is targeting the EXACT output described in the task.

DEFINITION OF OFF-TOPIC: A submission is off-topic if it targets a clearly different subject or produces a different type of output than what the task specifies.
Examples:
- Task: build a PORTFOLIO website → submission builds a TO-DO LIST app = OFF-TOPIC
- Task: write a POEM about rain → submission writes a recipe = OFF-TOPIC
- Task: write a HAIKU about cats → submission writes a haiku about dogs = OFF-TOPIC
- Task: build a PORTFOLIO website → submission builds a portfolio website = ON-TOPIC (even if the prompt is poor quality)

SUBMISSIONS:
${submissionsText}

Respond with ONLY a JSON array (no markdown):
[
  { "playerName": "exact name", "relevant": true, "reason": "One sentence why" }
]`;
  };

  const buildQualityPrompt = (
    batch: typeof submissionRows,
    category: string,
    challenge: string
  ) => {
    const submissionsText = batch
      .map((s, i) => `Submission ${i + 1} by ${s.playerName}:\n"${s.promptText}"`)
      .join("\n\n");

    return `You are a prompt engineering judge. All submissions below have already passed a relevance check — they are all on-topic for the challenge.

CHALLENGE:
- Category / Persona: "${category}"
- Task: "${challenge}"

SUBMISSIONS:
${submissionsText}

Score each submission 0–100 based on:
- Specificity and directness for the exact task (30 pts)
- Clarity and structure (20 pts)
- Creativity and originality (20 pts)
- Prompt engineering technique: role definition, context, output format, constraints (30 pts)

Respond with ONLY a JSON array (no markdown):
[
  { "playerName": "exact name", "score": 85, "feedback": "1-2 sentence specific feedback" }
]`;
  };

  // Run relevance checks in parallel batches
  const relevanceChunks: (typeof submissionRows)[] = [];
  for (let i = 0; i < submissionRows.length; i += BATCH_SIZE) {
    relevanceChunks.push(submissionRows.slice(i, i + BATCH_SIZE));
  }

  const relevanceResults = await Promise.all(
    relevanceChunks.map(async (batch) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 800,
        messages: [{ role: "user", content: buildRelevancePrompt(batch, round.category, round.prompt) }],
      });
      const text = completion.choices[0]?.message?.content ?? "[]";
      try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]) as { playerName: string; relevant: boolean; reason: string }[];
      } catch {
        req.log.error({ text }, "Failed to parse relevance check");
      }
      return [] as { playerName: string; relevant: boolean; reason: string }[];
    })
  );

  const relevanceMap = new Map<string, { relevant: boolean; reason: string }>();
  for (const r of relevanceResults.flat()) {
    relevanceMap.set(r.playerName, { relevant: r.relevant, reason: r.reason });
  }

  // Split into on-topic and off-topic groups
  const onTopicRows = submissionRows.filter(s => relevanceMap.get(s.playerName)?.relevant !== false);
  const offTopicRows = submissionRows.filter(s => relevanceMap.get(s.playerName)?.relevant === false);

  // ── PASS 2: Quality scoring for on-topic submissions only ───────────────
  const qualityChunks: (typeof submissionRows)[] = [];
  for (let i = 0; i < onTopicRows.length; i += BATCH_SIZE) {
    qualityChunks.push(onTopicRows.slice(i, i + BATCH_SIZE));
  }

  const qualityResults = await Promise.all(
    qualityChunks.map(async (batch) => {
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 1200,
        messages: [{ role: "user", content: buildQualityPrompt(batch, round.category, round.prompt) }],
      });
      const text = completion.choices[0]?.message?.content ?? "[]";
      try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]) as RawJudgment[];
      } catch {
        req.log.error({ text }, "Failed to parse quality judgment");
      }
      return [] as RawJudgment[];
    })
  );

  const qualityJudgments: RawJudgment[] = qualityResults.flat();

  // Off-topic submissions are hard-capped at 5 by code — AI has no say
  const offTopicJudgments: RawJudgment[] = offTopicRows.map(s => {
    const rel = relevanceMap.get(s.playerName);
    return {
      playerName: s.playerName,
      score: 5,
      feedback: `Off-topic: the challenge asked for "${round.prompt}" but this submission targets something different. ${rel?.reason ?? ""}`,
    };
  });

  const rawJudgments: RawJudgment[] = [...qualityJudgments, ...offTopicJudgments];

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

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

    return `You are a strict judge in a prompt engineering competition. Your job is to score each participant's submission based on how well it responds to the specific challenge.

CHALLENGE DETAILS:
- Category / Persona: "${category}"
- Task: "${challenge}"

SUBMISSIONS TO JUDGE:
${submissionsText}

---
STEP 1 — RELEVANCE GATE (do this first for every submission, no exceptions):

Read the challenge task carefully. Identify the SPECIFIC thing it is asking for (e.g., a portfolio website, a poem about the ocean, a recipe for pasta).

For each submission, ask: "Does this submission directly address the exact topic/subject/output requested in the task?"

Examples of OFF-TOPIC submissions that MUST score 0–10:
- Challenge asks for a PORTFOLIO app → submission builds a TO-DO LIST app (different app entirely)
- Challenge asks for a POEM → submission writes a recipe
- Challenge asks for a HAIKU about rain → submission writes a haiku about fire
- Challenge asks for a RESUME → submission generates a cover letter

A submission is off-topic if it targets a DIFFERENT subject or output than what the challenge explicitly specifies, even if the prompt itself is very detailed, professional, and well-crafted. Quality does NOT excuse irrelevance.

If a submission is off-topic: score it 0–10. Feedback must explicitly name what was asked vs what was submitted.

---
STEP 2 — QUALITY SCORING (only for on-topic submissions):

Score 0–100 based on:
- Relevance & direct adherence to the exact task (35 pts) — does it nail the specific subject?
- Clarity and specificity (20 pts)
- Creativity (15 pts)
- Prompt engineering technique: role definition, context, output format, constraints (30 pts)

---
Respond with ONLY a valid JSON array (no markdown, no text outside the array):
[
  {
    "playerName": "exact name from submission",
    "score": 85,
    "feedback": "Specific 1-2 sentence feedback"
  }
]

CRITICAL: A beautifully written prompt for the WRONG task scores 0–10. No exceptions.`;
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

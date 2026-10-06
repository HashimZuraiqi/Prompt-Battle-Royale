import { useParams } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetRoom,
  useGetRoomPlayers,
  useStartRoom,
  useCreateRound,
  useGetCurrentRound,
  useCloseRound,
  useJudgeRound,
  getGetCurrentRoundQueryKey,
  getGetLeaderboardQueryKey
} from "@workspace/api-client-react";
import { useLocalStorage, useCountdown } from "@/lib/hooks";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Loader2, Play, Trophy, Sparkles, RefreshCw, Clock, Shuffle, Check, Gavel, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Eyebrow,
  GdgLockup,
  GoogleColors,
  GDG_COLORS,
  glassColor,
  pillColor,
  textColor,
} from "@/components/gdg/brand";
import { TRACKS, deckByTrack, type DeckTrack, type DeckChallenge } from "@/lib/gdg-deck";

export default function HostPanel() {
  const { code } = useParams();
  const safeCode = code || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [hostName] = useLocalStorage("prompt-game-host", "");
  const [showLobby, setShowLobby] = useState(false);
  const [usedIds, setUsedIds] = useLocalStorage<string[]>(`gdg-deck-used-${safeCode}`, []);

  const { data: room } = useGetRoom(safeCode, {
    query: { refetchInterval: 2000 }
  });

  const { data: players = [] } = useGetRoomPlayers(safeCode, {
    query: { refetchInterval: 2000 }
  });

  const { data: currentRound } = useGetCurrentRound(safeCode, {
    query: { refetchInterval: 2000 }
  });

  const startRoom = useStartRoom();
  const createRound = useCreateRound();
  const closeRound = useCloseRound();
  const judgeRound = useJudgeRound();

  const [category, setCategory] = useState("");
  const [promptText, setPromptText] = useState("");
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [track, setTrack] = useState<DeckTrack>("gdg");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [theme, setTheme] = useState("GDG PSUT");
  const [isGenerating, setIsGenerating] = useState(false);

  const joinUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/join`;

  const pickChallenge = (c: DeckChallenge) => {
    setPickedId(c.id);
    setCategory(c.category);
    setPromptText(c.task);
  };

  const handleSurprise = () => {
    const pool = deckByTrack(track);
    const fresh = pool.filter(c => !usedIds.includes(c.id) && c.id !== pickedId);
    const from = fresh.length > 0 ? fresh : pool;
    pickChallenge(from[Math.floor(Math.random() * from.length)]);
  };

  const handleGenerateChallenge = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/rooms/${safeCode}/generate-challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName, theme }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json() as { category: string; task: string };
      setPickedId(null);
      setCategory(data.category);
      setPromptText(data.task);
    } catch {
      toast({ title: "Failed to generate challenge", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartGame = () => {
    startRoom.mutate({ code: safeCode, data: { hostName } });
  };

  const handleStartRound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !promptText.trim()) return;
    createRound.mutate(
      { code: safeCode, data: { hostName, category, prompt: promptText, timeLimit } },
      {
        onSuccess: () => {
          if (pickedId) setUsedIds([...usedIds, pickedId]);
          setPickedId(null);
          setCategory("");
          setPromptText("");
        }
      }
    );
  };

  const handleCloseRound = () => {
    if (!currentRound) return;
    closeRound.mutate({ code: safeCode, roundId: currentRound.id, data: { hostName } });
  };

  const handleJudgeRound = () => {
    if (!currentRound) return;
    judgeRound.mutate(
      { code: safeCode, roundId: currentRound.id, data: { hostName } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentRoundQueryKey(safeCode) });
          queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey(safeCode) });
        },
        onError: () => {
          toast({ title: "Failed to judge round", variant: "destructive" });
        }
      }
    );
  };

  const isRoundOpen = currentRound?.status === "open";
  const timeLeft = useCountdown(
    currentRound?.timeLimit || 60,
    currentRound?.createdAt || "",
    () => {
      if (currentRound?.status === "open" && !closeRound.isPending) {
        handleCloseRound();
      }
    }
  );
  const timerPercent = Math.min(100, (timeLeft / (currentRound?.timeLimit || 60)) * 100);
  const timerColor = timeLeft <= 10 ? "bg-g-red" : timeLeft <= 20 ? "bg-g-yellow" : "bg-g-blue";

  const submissionCount = currentRound?.submissions?.length || 0;

  if (!room) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-g-blue" />
      </div>
    );
  }

  const playerChips = (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence>
        {players.map((p, i) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${pillColor[GDG_COLORS[i % 4]]} text-base`}
          >
            {p.name}
            {p.totalScore > 0 && <span className="text-xs text-white/60 tabular-nums">{p.totalScore}</span>}
          </motion.span>
        ))}
      </AnimatePresence>
      {players.length === 0 && (
        <div className="text-white/50 italic py-2">Waiting for the first brave soul…</div>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] pb-10">

      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-ink/70 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 max-w-5xl mx-auto px-4 py-3">
          <div className="hidden sm:block"><GdgLockup size="sm" /></div>
          <div className="text-left sm:text-center">
            <div className="eyebrow text-white/50">Room code</div>
            <div className="font-display text-2xl font-extrabold tracking-[0.2em] text-paper" data-testid="text-room-code">{room.code}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLobby(v => !v)}
              className="btn-ghost px-3 py-2 text-sm"
              data-testid="button-toggle-lobby"
            >
              <Users className="w-4 h-4" />
              {players.length}
              {showLobby ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <Link href={`/leaderboard/${safeCode}`}>
              <span className="btn-gdg-blue px-4 py-2 text-sm cursor-pointer" data-testid="link-leaderboard">
                <Trophy className="w-4 h-4" /> Board
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Collapsible lobby */}
      <AnimatePresence>
        {showLobby && room.status !== "waiting" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/10"
          >
            <div className="px-4 py-4 max-w-5xl mx-auto">
              <Eyebrow color="green">In the room</Eyebrow>
              <div className="mt-3">{playerChips}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pt-6 max-w-5xl mx-auto space-y-6">

        {/* Waiting state — designed to be projected */}
        {room.status === "waiting" && (
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
            <div>
              <Eyebrow color="blue">Event 01 · You are here</Eyebrow>
              <h2 className="mt-3 text-4xl sm:text-6xl font-extrabold text-paper leading-tight">
                Grab your phone.
                <br />
                <span className="text-g-blue">Join</span> the <span className="text-g-green">battle</span>.
              </h2>
              <div className="glass mt-6 p-5">
                <div className="eyebrow text-white/50">Go to</div>
                <div className="mt-1 text-lg sm:text-2xl font-semibold text-paper break-all">{joinUrl}</div>
                <div className="eyebrow text-white/50 mt-5">and enter</div>
                <div className="font-display font-extrabold text-6xl sm:text-8xl tracking-[0.12em] leading-none mt-2">
                  <GoogleColors text={room.code} />
                </div>
              </div>
            </div>

            <div className="glass-green p-5 space-y-5">
              <div className="flex items-baseline justify-between">
                <Eyebrow color="green">Curious people</Eyebrow>
                <div className="font-display text-4xl font-extrabold text-paper tabular-nums">{players.length}</div>
              </div>
              {playerChips}
              <button
                onClick={handleStartGame}
                disabled={startRoom.isPending || players.length === 0}
                className="btn-gdg w-full py-4 text-lg"
                data-testid="button-start-game"
              >
                {startRoom.isPending ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <><Play className="w-5 h-5 fill-current" /> Start Game</>
                )}
              </button>
              {players.length === 0 && (
                <p className="text-sm text-white/50 text-center">Need at least 1 player to start</p>
              )}
            </div>
          </div>
        )}

        {/* Active game */}
        {room.status === "active" && (
          <>
            {/* No round or last round judged — pick the next challenge */}
            {(!currentRound || currentRound.status === "judged") && (
              <div className="space-y-5">
                <div>
                  <Eyebrow color="yellow">On our stage</Eyebrow>
                  <h3 className="mt-2 text-3xl sm:text-4xl font-extrabold text-paper">
                    Round {(currentRound?.roundNumber ?? 0) + 1}: pick a challenge
                  </h3>
                </div>

                {/* Track tabs */}
                <div className="flex flex-wrap gap-2">
                  {TRACKS.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTrack(t.id)}
                      className={`${pillColor[t.color]} px-4 py-2 transition-all ${track === t.id ? "ring-2 ring-offset-2 ring-offset-ink ring-white/60 bg-white/15" : "opacity-70 hover:opacity-100"}`}
                      data-testid={`button-track-${t.id}`}
                    >
                      {t.label}
                      <span className="text-xs text-white/50">
                        {deckByTrack(t.id).filter(c => !usedIds.includes(c.id)).length}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleSurprise}
                    className="btn-gdg px-4 py-2 text-sm ml-auto"
                    data-testid="button-surprise"
                  >
                    <Shuffle className="w-4 h-4" /> Surprise me
                  </button>
                </div>

                {/* Deck cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                  {deckByTrack(track).map((c, i) => {
                    const used = usedIds.includes(c.id);
                    const picked = pickedId === c.id;
                    const color = GDG_COLORS[i % 4];
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickChallenge(c)}
                        className={`${glassColor[color]} flex flex-col text-left p-4 transition-all hover:-translate-y-0.5 ${picked ? "ring-2 ring-g-yellow" : ""} ${used ? "opacity-40" : ""}`}
                        data-testid={`card-challenge-${c.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-display font-bold ${textColor[color]}`}>{c.category}</span>
                          {picked ? <Check className="w-4 h-4 text-g-yellow" /> : used ? <span className="text-[10px] eyebrow text-white/50">played</span> : null}
                        </div>
                        <p className="mt-1.5 text-sm text-white/75 leading-snug">{c.task}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid lg:grid-cols-[1fr_320px] gap-4">
                  <form onSubmit={handleStartRound} className="glass p-5 space-y-4">
                    <div>
                      <label className="eyebrow text-white/50 block mb-1.5">Category</label>
                      <input
                        className="field p-3 text-base"
                        placeholder="e.g. Hype Caption"
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setPickedId(null); }}
                        required
                        data-testid="input-category"
                      />
                    </div>
                    <div>
                      <label className="eyebrow text-white/50 block mb-1.5">Challenge</label>
                      <textarea
                        className="field p-3 text-base min-h-[96px] resize-none"
                        placeholder="Pick a card above, hit Surprise me, or write your own…"
                        value={promptText}
                        onChange={(e) => { setPromptText(e.target.value); setPickedId(null); }}
                        required
                        data-testid="input-prompt-task"
                      />
                    </div>
                    <div>
                      <label className="eyebrow text-white/50 block mb-1.5">Time limit</label>
                      <div className="flex gap-2">
                        {[30, 60, 90, 120].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTimeLimit(t)}
                            className={`flex-1 py-2 rounded-full font-semibold text-sm border transition-all ${timeLimit === t ? "bg-g-blue border-g-blue text-white" : "border-white/20 text-white/70 hover:bg-white/10"}`}
                            data-testid={`button-time-${t}`}
                          >
                            {t}s
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={createRound.isPending || !category.trim() || !promptText.trim()}
                      className="btn-gdg w-full py-4 text-lg"
                      data-testid="button-start-round"
                    >
                      {createRound.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <><Play className="w-5 h-5 fill-current" /> Start Round</>}
                    </button>
                  </form>

                  {/* AI remix */}
                  <div className="glass-blue p-5 space-y-3 self-start">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-g-blue" />
                      <span className="eyebrow text-g-blue">AI Remix</span>
                    </div>
                    <p className="text-sm text-white/60">Let the AI invent a fresh challenge on any theme.</p>
                    <input
                      className="field p-2.5 text-sm"
                      placeholder="Theme (e.g. GDG PSUT, Flutter, exams…)"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGenerateChallenge(); } }}
                      data-testid="input-theme"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateChallenge}
                      disabled={isGenerating}
                      className="btn-gdg-blue w-full px-4 py-2.5 text-sm"
                      data-testid="button-generate"
                    >
                      {isGenerating
                        ? <><Loader2 className="animate-spin w-4 h-4" /> Crafting…</>
                        : <><RefreshCw className="w-4 h-4" /> Generate</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Active round */}
            {currentRound && currentRound.status !== "judged" && (
              <div className="glass-yellow p-5 sm:p-8 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Eyebrow color="yellow">Round {String(currentRound.roundNumber).padStart(2, "0")}</Eyebrow>
                    <div className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-paper">{currentRound.category}</div>
                  </div>
                  {isRoundOpen ? (
                    <div className={`flex items-center gap-2 font-display font-extrabold text-3xl sm:text-4xl px-4 py-2 rounded-2xl tabular-nums ${timeLeft <= 10 ? "bg-g-red text-white animate-pulse" : timeLeft <= 20 ? "bg-g-yellow text-ink" : "bg-g-blue text-white"}`} data-testid="text-host-timer">
                      <Clock className="w-6 h-6" />
                      {timeLeft}s
                    </div>
                  ) : (
                    <div className="pill-yellow uppercase" data-testid="text-round-status">
                      {currentRound.status}
                    </div>
                  )}
                </div>

                {isRoundOpen && (
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${timerColor} transition-all duration-1000`}
                      style={{ width: `${timerPercent}%` }}
                    />
                  </div>
                )}

                <p className="text-2xl sm:text-4xl font-display font-bold text-paper leading-snug">
                  {currentRound.prompt}
                </p>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-white/15 bg-white/5 p-4">
                  <div className="font-semibold text-lg text-paper">
                    Submitted <span className="font-display text-g-green text-2xl">{submissionCount}</span>
                    <span className="text-white/50"> / {players.length}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {players.slice(0, 16).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${i < submissionCount ? "bg-g-green" : "bg-white/15"}`}
                      />
                    ))}
                    {players.length > 16 && <span className="text-xs text-white/50">+{players.length - 16}</span>}
                  </div>
                </div>

                {currentRound.status === "open" && (
                  <button
                    onClick={handleCloseRound}
                    disabled={closeRound.isPending}
                    className="btn-ghost w-full py-3"
                    data-testid="button-close-round"
                  >
                    {closeRound.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : "Close submissions early"}
                  </button>
                )}

                {currentRound.status === "closed" && (
                  <>
                    <button
                      onClick={handleJudgeRound}
                      disabled={judgeRound.isPending}
                      className="btn-gdg w-full py-4 text-lg"
                      data-testid="button-judge-round"
                    >
                      {judgeRound.isPending ? (
                        <><Loader2 className="animate-spin w-5 h-5" /> Judging with AI…</>
                      ) : (
                        <><Gavel className="w-5 h-5" /> Let the AI judge</>
                      )}
                    </button>
                    {judgeRound.isPending && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-blue p-8 text-center"
                      >
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-g-blue" />
                        <div className="font-display text-2xl font-extrabold text-paper">The AI is reading every prompt…</div>
                        <div className="text-sm text-white/60 mt-1">Specificity, clarity, creativity, technique</div>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Results revealed */}
            {currentRound && currentRound.status === "judged" && currentRound.submissions && currentRound.submissions.length > 0 && (
              <div className="space-y-3">
                <Eyebrow color="green">Round {String(currentRound.roundNumber).padStart(2, "0")} results · {currentRound.category}</Eyebrow>
                {[...currentRound.submissions]
                  .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                  .map((sub, i) => {
                    const color = i < 4 ? GDG_COLORS[i] : null;
                    return (
                      <motion.div
                        key={sub.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`${color ? glassColor[color] : "glass"} p-4 flex items-start gap-4`}
                      >
                        <div className={`font-display text-3xl font-extrabold w-12 shrink-0 ${color ? textColor[color] : "text-white/50"}`}>
                          {String(sub.rank ?? i + 1).padStart(2, "0")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg text-paper truncate">{sub.playerName}</div>
                          <div className="text-sm text-white/60 mt-0.5 line-clamp-2">{sub.feedback}</div>
                        </div>
                        <div className="font-display text-3xl font-extrabold text-paper shrink-0 tabular-nums">{sub.score}</div>
                      </motion.div>
                    );
                  })
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

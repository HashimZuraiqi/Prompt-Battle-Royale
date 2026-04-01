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
import { Users, Loader2, Play, Trophy, Zap, ShieldAlert, ChevronDown, ChevronUp, Sparkles, RefreshCw, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function HostPanel() {
  const { code } = useParams();
  const safeCode = code || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [hostName] = useLocalStorage("prompt-game-host", "");
  const [showLobby, setShowLobby] = useState(false);

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
  const [theme, setTheme] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
  const timerColor = timeLeft <= 10 ? "bg-destructive" : timeLeft <= 20 ? "bg-yellow-400" : "bg-primary";

  const submissionCount = currentRound?.submissions?.length || 0;

  if (!room) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-white pb-8">

      {/* Top bar */}
      <div className="bg-primary text-primary-foreground px-4 py-3 border-b-4 border-foreground sticky top-0 z-20">
        <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
          <div>
            <div className="text-xs font-bold uppercase opacity-80">Room Code</div>
            <div className="text-2xl font-black tracking-widest" data-testid="text-room-code">{room.code}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLobby(v => !v)}
              className="flex items-center gap-1 bg-white/20 border-2 border-white/50 px-3 py-2 font-bold text-sm rounded-sm"
              data-testid="button-toggle-lobby"
            >
              <Users className="w-4 h-4" />
              {players.length}
              {showLobby ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <Link href={`/leaderboard/${safeCode}`}>
              <span className="flex items-center gap-1 bg-white text-primary border-2 border-foreground px-3 py-2 font-bold text-sm cursor-pointer" data-testid="link-leaderboard">
                <Trophy className="w-4 h-4" /> Board
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Collapsible lobby */}
      <AnimatePresence>
        {showLobby && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b-4 border-foreground bg-white"
          >
            <div className="px-4 py-3 max-w-2xl mx-auto">
              <div className="text-sm font-black uppercase mb-2 text-muted-foreground">Players Joined</div>
              <div className="grid grid-cols-2 gap-2">
                <AnimatePresence>
                  {players.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-2 border-2 border-foreground font-bold text-sm flex items-center justify-between bg-muted"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 border border-foreground ml-1 shrink-0">{p.totalScore}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {players.length === 0 && (
                  <div className="col-span-2 text-muted-foreground font-medium italic text-center py-4 text-sm">
                    Waiting for players to join...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-4">

        {/* Waiting state */}
        {room.status === "waiting" && (
          <div className="card-neo p-6 bg-white text-center space-y-4">
            <h2 className="text-2xl font-black uppercase">Waiting for Players</h2>
            <p className="text-muted-foreground font-medium">
              Share the code <strong>{room.code}</strong> with participants. Start when everyone is in.
            </p>
            <button
              onClick={handleStartGame}
              disabled={startRoom.isPending || players.length === 0}
              className="w-full btn-neo py-4 text-xl flex items-center justify-center gap-2"
              data-testid="button-start-game"
            >
              {startRoom.isPending ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <><Play className="w-5 h-5 fill-current" /> Start Game</>
              )}
            </button>
            {players.length === 0 && (
              <p className="text-sm text-muted-foreground">Need at least 1 player to start</p>
            )}
          </div>
        )}

        {/* Active game */}
        {room.status === "active" && (
          <>
            {/* No round or last round judged — show create round form */}
            {(!currentRound || currentRound.status === "judged") && (
              <div className="card-neo p-5 bg-white space-y-4">
                <h3 className="text-xl font-black uppercase flex items-center gap-2">
                  <Zap className="text-primary fill-primary w-5 h-5" /> New Round
                </h3>

                {/* AI Generation Panel */}
                <div className="bg-muted border-2 border-foreground p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-black uppercase">AI Challenge Generator</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="input-neo flex-1 p-2 text-sm"
                      placeholder="Optional theme (e.g. web dev, poetry, cooking...)"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGenerateChallenge(); } }}
                      data-testid="input-theme"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateChallenge}
                      disabled={isGenerating}
                      className="btn-neo px-4 py-2 text-sm font-black flex items-center gap-2 shrink-0"
                      data-testid="button-generate"
                    >
                      {isGenerating
                        ? <Loader2 className="animate-spin w-4 h-4" />
                        : <><RefreshCw className="w-4 h-4" /> Generate</>
                      }
                    </button>
                  </div>
                  {isGenerating && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground font-medium italic">
                      AI is crafting a challenge...
                    </motion.div>
                  )}
                  {(category || promptText) && !isGenerating && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-primary font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Fields filled — edit them freely below
                    </motion.div>
                  )}
                </div>

                <form onSubmit={handleStartRound} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold uppercase mb-1">Category / Type</label>
                    <input
                      className="input-neo w-full p-3 text-base"
                      placeholder="e.g. Build a Web App, Write a Poem"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      data-testid="input-category"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase mb-1">Task / Challenge</label>
                    <textarea
                      className="input-neo w-full p-3 text-base min-h-[100px] resize-none"
                      placeholder="e.g. Build a student portfolio website with an About section, Projects grid, and a Contact form."
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      required
                      data-testid="input-prompt-task"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase mb-1">Time Limit</label>
                    <div className="flex gap-2">
                      {[30, 60, 90, 120].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTimeLimit(t)}
                          className={`flex-1 py-2 font-black text-sm border-2 border-foreground transition-all ${timeLimit === t ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted"}`}
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
                    className="w-full btn-neo py-4 text-lg font-black"
                    data-testid="button-start-round"
                  >
                    {createRound.isPending ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : "Start Round"}
                  </button>
                </form>
              </div>
            )}

            {/* Active round */}
            {currentRound && currentRound.status !== "judged" && (
              <div className="card-neo p-5 bg-white space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold uppercase text-muted-foreground">Round {currentRound.roundNumber}</div>
                    <div className="inline-block bg-secondary text-secondary-foreground px-2 py-0.5 border-2 border-foreground font-black uppercase text-base mt-1">
                      {currentRound.category}
                    </div>
                  </div>
                  {isRoundOpen ? (
                    <div className={`flex items-center gap-2 font-black text-2xl px-3 py-1 border-2 border-foreground tabular-nums ${timeLeft <= 10 ? "bg-destructive text-white animate-pulse" : timeLeft <= 20 ? "bg-yellow-400 text-foreground" : "bg-primary text-primary-foreground"}`} data-testid="text-host-timer">
                      <Clock className="w-5 h-5" />
                      {timeLeft}s
                    </div>
                  ) : (
                    <div className={`text-lg font-black uppercase px-3 py-1 border-2 border-foreground ${currentRound.status === "open" ? "bg-primary text-primary-foreground animate-pulse" : "bg-muted"}`} data-testid="text-round-status">
                      {currentRound.status}
                    </div>
                  )}
                </div>

                {/* Timer progress bar */}
                {isRoundOpen && (
                  <div className="h-3 bg-muted border-2 border-foreground w-full -mt-1">
                    <motion.div
                      className={`h-full ${timerColor} transition-all duration-1000`}
                      style={{ width: `${timerPercent}%` }}
                    />
                  </div>
                )}

                <div className="bg-muted p-4 border-l-4 border-primary text-base font-medium leading-snug">
                  {currentRound.prompt}
                </div>

                <div className="flex items-center justify-between bg-foreground/5 border-2 border-foreground p-3">
                  <div className="font-black text-base uppercase">
                    Submitted: <span className="text-primary">{submissionCount}</span> / {players.length}
                  </div>
                  <div className="flex gap-2">
                    {/* Progress dots */}
                    {players.slice(0, 8).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full border-2 border-foreground ${i < submissionCount ? "bg-primary" : "bg-white"}`}
                      />
                    ))}
                    {players.length > 8 && <span className="text-xs font-bold">+{players.length - 8}</span>}
                  </div>
                </div>

                {currentRound.status === "open" && (
                  <button
                    onClick={handleCloseRound}
                    disabled={closeRound.isPending}
                    className="w-full btn-neo-secondary py-3 text-base font-black flex items-center justify-center gap-2"
                    data-testid="button-close-round"
                  >
                    {closeRound.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : "Close Submissions Early"}
                  </button>
                )}

                {currentRound.status === "closed" && (
                  <>
                    <button
                      onClick={handleJudgeRound}
                      disabled={judgeRound.isPending}
                      className="w-full btn-neo py-3 text-base font-black flex items-center justify-center gap-2"
                      data-testid="button-judge-round"
                    >
                      {judgeRound.isPending ? (
                        <><Loader2 className="animate-spin w-5 h-5" /> Judging with AI...</>
                      ) : (
                        <><ShieldAlert className="w-5 h-5" /> Trigger AI Judgment</>
                      )}
                    </button>
                    {judgeRound.isPending && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-primary text-primary-foreground p-6 border-4 border-foreground text-center"
                      >
                        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
                        <div className="text-xl font-black uppercase">AI is judging...</div>
                        <div className="text-sm font-bold mt-1 opacity-80">Evaluating all submissions</div>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Results revealed */}
            {currentRound && currentRound.status === "judged" && currentRound.submissions && currentRound.submissions.length > 0 && (
              <div className="card-neo p-5 bg-white space-y-3">
                <h3 className="text-xl font-black uppercase text-center border-b-4 border-foreground pb-3">Round Results</h3>
                {[...currentRound.submissions]
                  .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                  .map((sub, i) => (
                    <motion.div
                      key={sub.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-3 border-2 border-foreground flex items-start gap-3 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-white"}`}
                    >
                      <div className="text-2xl font-black w-8 shrink-0 text-center">#{sub.rank}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-base truncate">{sub.playerName}</div>
                        <div className="text-xs font-medium opacity-80 mt-0.5 line-clamp-2">{sub.feedback}</div>
                      </div>
                      <div className="text-2xl font-black shrink-0">{sub.score}</div>
                    </motion.div>
                  ))
                }
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import { useParams, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import {
  useGetRoom,
  useGetCurrentRound,
  useSubmitPrompt
} from "@workspace/api-client-react";
import { useLocalStorage, useCountdown } from "@/lib/hooks";
import { motion } from "framer-motion";
import { Loader2, Send, Clock, Trophy, Check } from "lucide-react";
import { Eyebrow, GdgLogo, GoogleColors, SlidePage } from "@/components/gdg/brand";

export default function PlayerView() {
  const { code } = useParams();
  const safeCode = code || "";
  const [, setLocation] = useLocation();
  
  const [playerId] = useLocalStorage("prompt-game-player-id", 0);
  const [playerName] = useLocalStorage("prompt-game-player-name", "");

  const [promptText, setPromptText] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const hasSubmittedRef = useRef(false);

  const { data: room } = useGetRoom(safeCode, {
    query: { refetchInterval: 2000, enabled: !!safeCode }
  });

  const { data: currentRound } = useGetCurrentRound(safeCode, {
    query: { refetchInterval: 2000, enabled: !!safeCode }
  });

  const submitPrompt = useSubmitPrompt();

  // Sync hasSubmitted FROM the server — but never go back to false once true this round
  useEffect(() => {
    if (currentRound?.submissions) {
      const sub = currentRound.submissions.find(s => s.playerId === playerId);
      if (sub) {
        hasSubmittedRef.current = true;
        setHasSubmitted(true);
        if (sub.promptText) setPromptText(sub.promptText);
      }
      // Never reset to false here — the player submitted, that's final until a new round
    }
  }, [currentRound, playerId]);

  // Reset state only when a new round starts
  useEffect(() => {
    hasSubmittedRef.current = false;
    setHasSubmitted(false);
    setPromptText("");
  }, [currentRound?.id]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!promptText.trim() || hasSubmittedRef.current || currentRound?.status !== "open") return;
    hasSubmittedRef.current = true; // Immediately lock to prevent double-fire
    submitPrompt.mutate(
      { code: safeCode, roundId: currentRound!.id, data: { playerId, promptText } },
      {
        onSuccess: () => setHasSubmitted(true),
        onError: () => { hasSubmittedRef.current = false; }, // Unlock on failure
      }
    );
  };

  const currentRoundRef = useRef(currentRound);
  useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);

  const promptTextRef = useRef(promptText);
  useEffect(() => { promptTextRef.current = promptText; }, [promptText]);

  const timeLeft = useCountdown(
    currentRound?.timeLimit || 60,
    currentRound?.createdAt || "",
    () => {
      if (
        !hasSubmittedRef.current &&
        currentRoundRef.current?.status === "open" &&
        promptTextRef.current.trim()
      ) {
        handleSubmit();
      }
    }
  );

  if (!playerId) {
    setLocation("/join");
    return null;
  }

  if (!room || room.status === "waiting") {
    return (
      <SlidePage>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
          <GdgLogo className="w-24 h-14" />
          <Eyebrow color="green">You're in</Eyebrow>
          <h1 className="text-5xl font-extrabold text-paper break-all">{playerName}</h1>
          <p className="text-white/60 max-w-xs">
            Eyes on the big screen. The host will start the battle any second now.
          </p>
          <div className="flex gap-2 mt-2">
            {(["bg-g-blue", "bg-g-red", "bg-g-yellow", "bg-g-green"] as const).map((c, i) => (
              <motion.span
                key={c}
                className={`w-3 h-3 rounded-full ${c}`}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
              />
            ))}
          </div>
        </div>
      </SlidePage>
    );
  }

  if (!currentRound) {
    return (
      <SlidePage>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <Eyebrow color="yellow">Get ready</Eyebrow>
          <h2 className="text-4xl font-extrabold text-paper">Round 01 is loading…</h2>
          <p className="text-white/60">Warm up those prompting fingers.</p>
          <Loader2 className="w-8 h-8 animate-spin text-g-yellow" />
        </div>
      </SlidePage>
    );
  }

  const isResults = currentRound.status === "judged";
  const isJudging = currentRound.status === "closed";
  const mySubmission = currentRound.submissions?.find(s => s.playerId === playerId);
  const myScore = room.players?.find(p => p.id === playerId)?.totalScore || 0;

  const timerPercent = Math.min(100, (timeLeft / (currentRound.timeLimit || 60)) * 100);
  const timerColor = timeLeft <= 10 ? "bg-g-red" : timeLeft <= 20 ? "bg-g-yellow" : "bg-g-blue";

  return (
    <div className="min-h-[100dvh] flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-ink/70 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <GdgLogo className="w-8 h-5 shrink-0" />
          <div className="font-semibold text-paper truncate max-w-[140px]" data-testid="text-player-name">{playerName}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="pill-green text-sm tabular-nums">{myScore} pts</div>
          {currentRound.status === "open" && (
            <div className={`flex items-center gap-1 font-display font-extrabold text-lg px-3 py-1 rounded-full tabular-nums ${timeLeft <= 10 ? "bg-g-red text-white animate-pulse" : timeLeft <= 20 ? "bg-g-yellow text-ink" : "bg-g-blue text-white"}`} data-testid="text-timer">
              <Clock className="w-4 h-4" />
              {timeLeft}
            </div>
          )}
        </div>
      </div>

      {/* Timer bar */}
      {currentRound.status === "open" && (
        <div className="h-1.5 bg-white/10 w-full shrink-0">
          <div
            className={`h-full ${timerColor} transition-all duration-1000`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-4 space-y-4 pb-8 w-full max-w-xl mx-auto">

        {/* Challenge */}
        <div className="glass-yellow p-5">
          <div className="flex items-center justify-between gap-2">
            <Eyebrow color="yellow">Round {String(currentRound.roundNumber).padStart(2, "0")}</Eyebrow>
            <span className="pill-yellow text-xs">{currentRound.category}</span>
          </div>
          <p className="mt-3 text-xl font-display font-bold text-paper leading-snug" data-testid="text-challenge">{currentRound.prompt}</p>
        </div>

        {/* States */}
        {isResults ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-4"
          >
            {mySubmission ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-blue p-4 text-center">
                    <div className="eyebrow text-g-blue">Score</div>
                    <div className="font-display text-6xl font-extrabold text-paper mt-1" data-testid="text-score">{mySubmission.score}</div>
                  </div>
                  <div className="glass-green p-4 text-center">
                    <div className="eyebrow text-g-green">Rank</div>
                    <div className="font-display text-6xl font-extrabold text-paper mt-1" data-testid="text-rank">#{mySubmission.rank}</div>
                  </div>
                </div>

                {mySubmission.rank === 1 && (
                  <div className="text-center font-display text-2xl font-extrabold">
                    <GoogleColors text="Round winner!" />
                  </div>
                )}

                <div className="glass p-4">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-g-yellow" />
                    <span className="eyebrow text-g-yellow">AI feedback</span>
                  </div>
                  <p className="mt-2 text-white/80 leading-relaxed" data-testid="text-feedback">
                    {mySubmission.feedback || "No feedback provided."}
                  </p>
                </div>

                <div className="glass p-4">
                  <div className="eyebrow text-white/50">Your prompt</div>
                  <p className="mt-2 text-sm text-white/60 italic leading-relaxed">
                    {mySubmission.promptText ? `"${mySubmission.promptText}"` : "Nothing submitted in time."}
                  </p>
                </div>
              </>
            ) : (
              <div className="glass p-10 text-center text-white/60">No submission this round</div>
            )}
            <p className="text-center text-sm text-white/50">Next round coming up — watch the big screen.</p>
          </motion.div>

        ) : isJudging ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-blue p-10 text-center"
          >
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-g-blue" />
            <div className="font-display text-2xl font-extrabold text-paper">The AI is judging</div>
            <div className="text-sm text-white/60 mt-2">Fingers crossed…</div>
          </motion.div>

        ) : currentRound.status === "open" ? (
          hasSubmitted ? (
            <div className="glass-green p-10 text-center">
              <Check className="w-12 h-12 mx-auto text-g-green" />
              <div className="font-display text-3xl font-extrabold text-paper mt-2">Locked in!</div>
              <div className="text-white/60 mt-1">Waiting for the others…</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="field min-h-[180px] p-4 text-base resize-none"
                placeholder="You are a… Your task is… Include… Format it as…"
                required
                data-testid="textarea-prompt"
              />
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="pill-blue text-xs">Give it a role</span>
                <span className="pill-red text-xs">Add context</span>
                <span className="pill-yellow text-xs">Set constraints</span>
                <span className="pill-green text-xs">Define the format</span>
              </div>
              <button
                type="submit"
                disabled={submitPrompt.isPending || !promptText.trim()}
                className="btn-gdg w-full py-4 text-lg"
                data-testid="button-submit-prompt"
              >
                {submitPrompt.isPending ? (
                  <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                  <><Send className="w-5 h-5" /> Submit Prompt</>
                )}
              </button>
            </form>
          )
        ) : null}
      </div>
    </div>
  );
}

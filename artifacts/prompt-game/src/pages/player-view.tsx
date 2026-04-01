import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  useGetRoom,
  useGetCurrentRound,
  useSubmitPrompt
} from "@workspace/api-client-react";
import { useLocalStorage, useCountdown } from "@/lib/hooks";
import { motion } from "framer-motion";
import { Loader2, Send, Clock, Trophy } from "lucide-react";

export default function PlayerView() {
  const { code } = useParams();
  const safeCode = code || "";
  const [, setLocation] = useLocation();
  
  const [playerId] = useLocalStorage("prompt-game-player-id", 0);
  const [playerName] = useLocalStorage("prompt-game-player-name", "");

  const [promptText, setPromptText] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { data: room } = useGetRoom(safeCode, {
    query: { refetchInterval: 2000, enabled: !!safeCode }
  });

  const { data: currentRound } = useGetCurrentRound(safeCode, {
    query: { refetchInterval: 2000, enabled: !!safeCode }
  });

  const submitPrompt = useSubmitPrompt();

  useEffect(() => {
    if (currentRound?.submissions) {
      const sub = currentRound.submissions.find(s => s.playerId === playerId);
      if (sub) {
        setHasSubmitted(true);
        if (sub.promptText) setPromptText(sub.promptText);
      } else {
        setHasSubmitted(false);
      }
    }
  }, [currentRound, playerId]);

  useEffect(() => {
    if (currentRound?.status === "open" && !hasSubmitted) {
      setPromptText("");
    }
  }, [currentRound?.id, currentRound?.status]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!promptText.trim() || hasSubmitted || currentRound?.status !== "open") return;
    submitPrompt.mutate(
      { code: safeCode, roundId: currentRound!.id, data: { playerId, promptText } },
      { onSuccess: () => setHasSubmitted(true) }
    );
  };

  const timeLeft = useCountdown(
    currentRound?.timeLimit || 60,
    currentRound?.createdAt || "",
    () => {
      if (!hasSubmitted && currentRound?.status === "open" && promptText.trim()) {
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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-secondary text-secondary-foreground text-center gap-4">
        <h1 className="text-3xl font-black uppercase bg-white text-foreground p-4 border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          You're In!
        </h1>
        <p className="text-xl font-bold uppercase">{playerName}</p>
        <p className="text-base font-bold opacity-80">Waiting for host to start...</p>
        <Loader2 className="mt-2 w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center gap-4">
        <h2 className="text-3xl font-black uppercase">Get Ready</h2>
        <p className="text-lg font-bold text-muted-foreground">Waiting for the next round...</p>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isResults = currentRound.status === "judged";
  const isJudging = currentRound.status === "closed";
  const mySubmission = currentRound.submissions?.find(s => s.playerId === playerId);
  const myScore = room.players?.find(p => p.id === playerId)?.totalScore || 0;

  const timerPercent = Math.min(100, (timeLeft / (currentRound.timeLimit || 60)) * 100);
  const timerColor = timeLeft <= 10 ? "bg-destructive" : timeLeft <= 20 ? "bg-yellow-400" : "bg-primary";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">

      {/* Header */}
      <div className="bg-foreground text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="font-black text-base truncate max-w-[150px]" data-testid="text-player-name">{playerName}</div>
        <div className="flex items-center gap-3">
          <div className="font-bold text-sm bg-primary text-primary-foreground px-3 py-1 border-2 border-white/30">
            {myScore} pts
          </div>
          {currentRound.status === "open" && (
            <div className={`flex items-center gap-1 font-black text-lg px-3 py-1 border-2 border-white/30 ${timeLeft <= 10 ? "bg-destructive animate-pulse" : "bg-secondary text-secondary-foreground"}`} data-testid="text-timer">
              <Clock className="w-4 h-4" />
              {timeLeft}
            </div>
          )}
        </div>
      </div>

      {/* Timer bar */}
      {currentRound.status === "open" && (
        <div className="h-2 bg-muted w-full shrink-0">
          <motion.div
            className={`h-full ${timerColor} transition-all`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-6">

        {/* Round info */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase text-muted-foreground">Round {currentRound.roundNumber}</span>
          <span className="bg-secondary text-secondary-foreground px-2 py-0.5 border-2 border-foreground font-black uppercase text-sm">
            {currentRound.category}
          </span>
        </div>

        {/* Challenge */}
        <div className="bg-muted p-4 border-l-4 border-primary border-y-2 border-r-2 border-foreground">
          <div className="text-xs font-bold uppercase text-muted-foreground mb-1">Your Challenge</div>
          <p className="text-base font-bold leading-snug" data-testid="text-challenge">{currentRound.prompt}</p>
        </div>

        {/* States */}
        {isResults ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-black uppercase text-center">Round Results</h2>

            {mySubmission ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-4 bg-primary text-primary-foreground border-4 border-foreground">
                    <div className="text-xs font-bold uppercase mb-1">Your Score</div>
                    <div className="text-5xl font-black" data-testid="text-score">{mySubmission.score}</div>
                  </div>
                  <div className="text-center p-4 bg-secondary text-secondary-foreground border-4 border-foreground">
                    <div className="text-xs font-bold uppercase mb-1">Rank</div>
                    <div className="text-5xl font-black" data-testid="text-rank">#{mySubmission.rank}</div>
                  </div>
                </div>

                <div className="bg-muted p-4 border-4 border-foreground">
                  <h3 className="text-sm font-black uppercase mb-2 flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-primary" /> AI Feedback
                  </h3>
                  <p className="text-sm font-medium leading-relaxed" data-testid="text-feedback">
                    {mySubmission.feedback || "No feedback provided."}
                  </p>
                </div>

                <div className="bg-white border-4 border-foreground p-4">
                  <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Your Prompt</div>
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground italic">"{mySubmission.promptText}"</p>
                </div>
              </>
            ) : (
              <div className="text-center p-10 border-4 border-dashed border-foreground">
                <div className="text-xl font-black uppercase text-muted-foreground">No submission this round</div>
              </div>
            )}
          </motion.div>

        ) : isJudging ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-primary text-primary-foreground p-8 border-4 border-foreground text-center"
          >
            <Loader2 className="w-14 h-14 animate-spin mx-auto mb-4" />
            <div className="text-2xl font-black uppercase">AI is Judging</div>
            <div className="text-sm font-bold mt-2 opacity-80">Results coming soon...</div>
          </motion.div>

        ) : currentRound.status === "open" ? (
          hasSubmitted ? (
            <div className="text-center p-10 bg-muted border-4 border-foreground border-dashed">
              <div className="text-2xl font-black uppercase text-primary mb-2">Submitted!</div>
              <div className="text-base font-bold text-muted-foreground">Waiting for others...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full input-neo min-h-[160px] p-4 text-base resize-none"
                placeholder="Write your best prompt here..."
                required
                data-testid="textarea-prompt"
              />
              <button
                type="submit"
                disabled={submitPrompt.isPending || !promptText.trim()}
                className="w-full btn-neo py-4 text-lg font-black flex items-center justify-center gap-2"
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

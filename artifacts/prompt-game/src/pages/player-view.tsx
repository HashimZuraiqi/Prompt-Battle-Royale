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

  // Poll for room and current round updates
  const { data: room } = useGetRoom(safeCode, {
    query: { refetchInterval: 2000, enabled: !!safeCode }
  });

  const { data: currentRound } = useGetCurrentRound(safeCode, {
    query: { refetchInterval: 2000, enabled: !!safeCode }
  });

  const submitPrompt = useSubmitPrompt();

  // Check if player already submitted this round
  useEffect(() => {
    if (currentRound && currentRound.submissions) {
      const sub = currentRound.submissions.find(s => s.playerId === playerId);
      if (sub) {
        setHasSubmitted(true);
        if (sub.promptText) {
          setPromptText(sub.promptText);
        }
      } else {
        setHasSubmitted(false);
      }
    }
  }, [currentRound, playerId]);

  // Reset prompt text when new round starts
  useEffect(() => {
    if (currentRound && currentRound.status === "open" && !hasSubmitted) {
      setPromptText("");
    }
  }, [currentRound?.id, currentRound?.status]);

  const timeLeft = useCountdown(
    currentRound?.timeLimit || 60,
    currentRound?.createdAt || "",
    () => {
      // Auto-submit if not submitted when time is up
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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-secondary text-secondary-foreground text-center">
        <h1 className="text-4xl md:text-6xl font-black uppercase mb-6 bg-white p-4 border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          You're in!
        </h1>
        <p className="text-2xl font-bold uppercase">Waiting for host to start...</p>
        <Loader2 className="mt-8 w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (!currentRound) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-4xl font-black uppercase mb-4">Get Ready</h2>
        <p className="text-2xl font-bold text-muted-foreground">Waiting for the next round...</p>
      </div>
    );
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!promptText.trim() || hasSubmitted || currentRound.status !== "open") return;

    submitPrompt.mutate(
      { code: safeCode, roundId: currentRound.id, data: { playerId, promptText } },
      {
        onSuccess: () => {
          setHasSubmitted(true);
        }
      }
    );
  };

  const isJudging = currentRound.status === "closed";
  const isResults = currentRound.status === "judged";
  
  // Find my submission in results
  const mySubmission = currentRound.submissions?.find(s => s.playerId === playerId);

  return (
    <div className="min-h-[100dvh] p-4 md:p-6 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white border-4 border-foreground p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="font-black text-xl uppercase">{playerName}</div>
          <div className="font-bold text-lg bg-accent text-accent-foreground px-3 py-1 border-2 border-foreground">
            Score: {room.players?.find(p => p.id === playerId)?.totalScore || 0}
          </div>
        </div>

        {isResults ? (
          /* RESULTS VIEW */
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="card-neo bg-white p-6 md:p-8"
          >
            <h2 className="text-4xl font-black uppercase text-center mb-8">Round Results</h2>
            
            {mySubmission ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                  <div className="text-center p-6 bg-primary text-primary-foreground border-4 border-foreground flex-1">
                    <div className="text-xl font-bold uppercase mb-2">Your Score</div>
                    <div className="text-6xl font-black">{mySubmission.score}</div>
                  </div>
                  <div className="text-center p-6 bg-secondary text-secondary-foreground border-4 border-foreground flex-1">
                    <div className="text-xl font-bold uppercase mb-2">Rank</div>
                    <div className="text-6xl font-black">#{mySubmission.rank}</div>
                  </div>
                </div>
                
                <div className="bg-muted p-6 border-4 border-foreground">
                  <h3 className="text-xl font-bold uppercase mb-4 flex items-center gap-2">
                    <Trophy className="text-primary" /> AI Feedback
                  </h3>
                  <p className="text-lg font-medium leading-relaxed">
                    {mySubmission.feedback || "No feedback provided."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-2xl font-bold p-12 text-muted-foreground border-4 border-foreground border-dashed">
                You didn't submit anything this round!
              </div>
            )}
            
          </motion.div>
        ) : (
          /* PLAY / WAITING VIEW */
          <motion.div 
            key={currentRound.id}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card-neo bg-white p-6 md:p-8"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-lg font-bold uppercase text-muted-foreground mb-1">Round {currentRound.roundNumber}</div>
                <div className="inline-block bg-secondary text-secondary-foreground px-3 py-1 border-2 border-foreground font-black uppercase text-xl">
                  {currentRound.category}
                </div>
              </div>
              
              {currentRound.status === "open" && (
                <div className="flex items-center gap-2 text-2xl font-black bg-primary text-primary-foreground px-4 py-2 border-4 border-foreground">
                  <Clock className="w-6 h-6" />
                  {timeLeft}s
                </div>
              )}
            </div>

            <div className="text-xl md:text-2xl font-bold mb-8 p-4 bg-muted border-l-8 border-primary">
              {currentRound.prompt}
            </div>

            {currentRound.status === "open" ? (
              hasSubmitted ? (
                <div className="text-center p-12 bg-muted border-4 border-foreground border-dashed">
                  <h3 className="text-3xl font-black uppercase mb-4 text-primary">Prompt Submitted!</h3>
                  <p className="text-xl font-bold text-muted-foreground">Waiting for other players...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    className="w-full input-neo min-h-[200px] p-6 text-xl"
                    placeholder="Write your prompt here..."
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={submitPrompt.isPending || !promptText.trim()}
                    className="w-full btn-neo py-6 text-2xl flex items-center justify-center gap-3"
                  >
                    {submitPrompt.isPending ? <Loader2 className="animate-spin" /> : <Send className="w-6 h-6" />}
                    Submit Prompt
                  </button>
                </form>
              )
            ) : (
              <div className="text-center p-12 bg-primary text-primary-foreground border-4 border-foreground">
                <Loader2 className="w-16 h-16 animate-spin mx-auto mb-6" />
                <h3 className="text-4xl font-black uppercase">Judging Phase</h3>
                <p className="text-xl font-bold mt-4">The AI is evaluating the responses...</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

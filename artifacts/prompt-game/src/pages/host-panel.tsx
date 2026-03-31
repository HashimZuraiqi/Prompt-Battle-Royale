import { useParams, useLocation } from "wouter";
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
import { useLocalStorage } from "@/lib/hooks";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Loader2, Play, CheckCircle2, ShieldAlert, Trophy, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function HostPanel() {
  const { code } = useParams();
  const safeCode = code || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [hostName] = useLocalStorage("prompt-game-host", "");

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

  // New Round Form State
  const [category, setCategory] = useState("");
  const [promptText, setPromptText] = useState("");
  const [timeLimit, setTimeLimit] = useState<number>(60);

  if (!room) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-foreground" /></div>;
  }

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
          // Invalidate to fetch results
          queryClient.invalidateQueries({ queryKey: getGetCurrentRoundQueryKey(safeCode) });
          queryClient.invalidateQueries({ queryKey: getGetLeaderboardQueryKey(safeCode) });
        },
        onError: () => {
          toast({ title: "Failed to judge round", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-white p-6 pb-24">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Room Info & Players */}
        <div className="space-y-6">
          <div className="card-neo p-6 bg-primary text-primary-foreground">
            <h2 className="text-xl font-bold uppercase mb-1 opacity-90">Room Code</h2>
            <div className="text-6xl font-black tracking-widest bg-white text-primary p-4 text-center border-4 border-foreground">
              {room.code}
            </div>
            <div className="mt-4 flex items-center gap-2 font-bold text-lg">
              <Users /> {players.length} Players Connected
            </div>
          </div>

          <div className="card-neo p-6 bg-white">
            <h3 className="text-2xl font-black uppercase border-b-4 border-foreground pb-2 mb-4">Lobby</h3>
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              <AnimatePresence>
                {players.map((p, i) => (
                  <motion.li 
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 border-2 border-foreground font-bold text-lg flex items-center justify-between"
                  >
                    <span>{p.name}</span>
                    <span className="text-sm bg-accent text-accent-foreground px-2 py-1 rounded-sm border border-foreground">{p.totalScore} pts</span>
                  </motion.li>
                ))}
                {players.length === 0 && (
                  <div className="text-muted-foreground font-medium italic text-center py-8">
                    Waiting for players to join...
                  </div>
                )}
              </AnimatePresence>
            </ul>
          </div>
        </div>

        {/* Right Column: Game Controls */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="flex justify-between items-center bg-white p-4 border-4 border-foreground shadow-sm">
            <div className="text-2xl font-black uppercase">
              Status: <span className={room.status === 'active' ? "text-primary" : "text-muted-foreground"}>{room.status}</span>
            </div>
            <div className="flex gap-4">
              <Link href={`/leaderboard/${safeCode}`}>
                <span className="btn-neo-white px-6 py-2 flex items-center gap-2 cursor-pointer">
                  <Trophy className="w-5 h-5" /> Leaderboard
                </span>
              </Link>
              {room.status === "waiting" && (
                <button 
                  onClick={handleStartGame}
                  disabled={startRoom.isPending || players.length === 0}
                  className="btn-neo px-6 py-2 flex items-center gap-2"
                >
                  {startRoom.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                  Start Game
                </button>
              )}
            </div>
          </div>

          {room.status === "active" && (
            <div className="card-neo p-8 bg-white">
              
              {!currentRound || currentRound.status === "judged" ? (
                // Setup New Round
                <div>
                  <h3 className="text-3xl font-black uppercase mb-6 flex items-center gap-3">
                    <Zap className="text-primary fill-primary" /> Create New Round
                  </h3>
                  <form onSubmit={handleStartRound} className="space-y-6">
                    <div>
                      <label className="block text-xl font-bold uppercase mb-2">Category / Persona</label>
                      <input 
                        className="input-neo w-full p-4 text-xl" 
                        placeholder="e.g. 1920s Detective, Shakespeare, Angry Chef"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xl font-bold uppercase mb-2">Task / Prompt Goal</label>
                      <textarea 
                        className="input-neo w-full p-4 text-xl min-h-[120px]" 
                        placeholder="e.g. Write a review for a modern smartphone as this persona."
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xl font-bold uppercase mb-2">Time Limit (seconds)</label>
                      <input 
                        type="number"
                        min="30"
                        max="300"
                        className="input-neo w-32 p-4 text-xl font-bold text-center" 
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(Number(e.target.value))}
                        required
                      />
                    </div>
                    <button type="submit" disabled={createRound.isPending} className="btn-neo w-full py-4 text-2xl">
                      {createRound.isPending ? <Loader2 className="animate-spin mx-auto" /> : "Start Round"}
                    </button>
                  </form>
                </div>
              ) : (
                // Active Round Panel
                <div>
                  <div className="flex justify-between items-start mb-8 border-b-4 border-foreground pb-4">
                    <div>
                      <h3 className="text-3xl font-black uppercase">Round {currentRound.roundNumber}</h3>
                      <p className="text-xl font-bold mt-2">
                        <span className="bg-secondary text-secondary-foreground px-2 py-1 border border-foreground mr-2">{currentRound.category}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold uppercase text-muted-foreground">Status</div>
                      <div className={`text-3xl font-black uppercase ${currentRound.status === 'open' ? 'text-secondary animate-pulse' : 'text-primary'}`}>
                        {currentRound.status}
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted p-6 border-4 border-foreground mb-8 text-xl font-medium">
                    {currentRound.prompt}
                  </div>

                  <div className="flex justify-between items-center mb-8">
                    <div className="text-2xl font-black uppercase">
                      Submissions: <span className="text-primary">{currentRound.submissions?.length || 0}</span> / {players.length}
                    </div>
                    
                    {currentRound.status === "open" && (
                      <button 
                        onClick={handleCloseRound}
                        disabled={closeRound.isPending}
                        className="btn-neo-secondary px-8 py-4 text-xl"
                      >
                        {closeRound.isPending ? <Loader2 className="animate-spin" /> : "Close Round Early"}
                      </button>
                    )}

                    {currentRound.status === "closed" && (
                      <button 
                        onClick={handleJudgeRound}
                        disabled={judgeRound.isPending}
                        className="btn-neo px-8 py-4 text-xl flex items-center gap-2"
                      >
                        {judgeRound.isPending ? (
                          <>
                            <Loader2 className="animate-spin" /> Judging with AI...
                          </>
                        ) : (
                          <>
                            <ShieldAlert /> Trigger AI Judgment
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {judgeRound.isPending && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-primary text-primary-foreground p-8 border-4 border-foreground text-center"
                    >
                      <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" />
                      <h4 className="text-3xl font-black uppercase">AI is analyzing prompts...</h4>
                      <p className="text-xl mt-2">Evaluating creativity, accuracy, and style.</p>
                    </motion.div>
                  )}

                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

import { useParams } from "wouter";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Medal } from "lucide-react";
import { Link } from "wouter";

export default function Leaderboard() {
  const { code } = useParams();
  const safeCode = code || "";

  const { data: leaderboard, isLoading } = useGetLeaderboard(safeCode, {
    query: { refetchInterval: 5000, enabled: !!safeCode }
  });

  if (isLoading) {
    return <div className="min-h-[100dvh] bg-background flex justify-center items-center font-bold text-2xl uppercase">Loading rankings...</div>;
  }

  if (!leaderboard) return null;

  return (
    <div className="min-h-[100dvh] w-full p-6 relative bg-background">
      <Link href={`/host/room/${safeCode}`} className="absolute top-6 left-6 btn-neo-white px-4 py-2 flex items-center gap-2 text-sm z-10">
        <ArrowLeft className="w-4 h-4" /> Back to Game
      </Link>

      <div className="max-w-4xl mx-auto pt-12">
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="inline-block p-6 bg-white border-4 border-foreground rounded-full mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
          >
            <Trophy className="w-16 h-16 text-primary fill-primary" />
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white [text-shadow:4px_4px_0_#111]">
            Global Leaderboard
          </h1>
          <p className="text-2xl font-bold mt-4 bg-white inline-block px-4 py-1 border-2 border-foreground">
            Room Code: {leaderboard.roomCode}
          </p>
        </div>

        <div className="space-y-4">
          {leaderboard.players.map((entry, index) => (
            <motion.div
              key={entry.playerId}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1, type: "spring" }}
              className={`flex items-center justify-between p-6 border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 ${
                index === 0 ? "bg-primary text-primary-foreground scale-105 my-8" : 
                index === 1 ? "bg-secondary text-secondary-foreground" : 
                index === 2 ? "bg-accent text-accent-foreground" : 
                "bg-white text-foreground"
              }`}
            >
              <div className="flex items-center gap-6">
                <div className={`text-4xl font-black w-12 text-center ${index === 0 ? "text-white" : "text-muted-foreground"}`}>
                  {entry.rank}
                </div>
                <div className="text-2xl md:text-4xl font-black uppercase truncate max-w-[200px] md:max-w-[400px]">
                  {entry.playerName}
                </div>
                {entry.roundsWon > 0 && (
                  <div className="hidden md:flex items-center gap-1 bg-black/10 px-3 py-1 rounded-full text-sm font-bold uppercase border-2 border-current">
                    <Medal className="w-4 h-4" /> {entry.roundsWon} Wins
                  </div>
                )}
              </div>
              
              <div className="text-3xl md:text-5xl font-black tracking-tighter">
                {entry.totalScore} <span className="text-lg md:text-2xl opacity-70">pts</span>
              </div>
            </motion.div>
          ))}

          {leaderboard.players.length === 0 && (
            <div className="text-center p-12 bg-white border-4 border-foreground card-neo">
              <h3 className="text-3xl font-black uppercase">No scores yet</h3>
              <p className="text-xl mt-2 font-bold text-muted-foreground">Start playing rounds to see the leaderboard!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

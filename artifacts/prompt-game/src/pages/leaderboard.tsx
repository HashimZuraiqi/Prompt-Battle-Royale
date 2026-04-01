import { useParams } from "wouter";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Medal, Star } from "lucide-react";
import { Link } from "wouter";

export default function Leaderboard() {
  const { code } = useParams();
  const safeCode = code || "";

  const { data: leaderboard, isLoading } = useGetLeaderboard(safeCode, {
    query: { refetchInterval: 5000, enabled: !!safeCode }
  });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex justify-center items-center">
        <div className="text-xl font-black uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!leaderboard) return null;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background">

      {/* Header */}
      <div className="bg-foreground text-white px-4 py-3 flex items-center justify-between shrink-0">
        <Link href={`/host/room/${safeCode}`} className="flex items-center gap-1 text-white font-bold text-sm" data-testid="link-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary fill-primary" />
          <span className="font-black text-lg uppercase">Leaderboard</span>
        </div>
        <div className="text-sm font-bold opacity-60">{leaderboard.roomCode}</div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8">
        {leaderboard.players.map((entry, index) => {
          const bgClass =
            index === 0 ? "bg-primary text-primary-foreground" :
            index === 1 ? "bg-secondary text-secondary-foreground" :
            index === 2 ? "bg-accent text-accent-foreground" :
            "bg-white text-foreground";

          return (
            <motion.div
              key={entry.playerId}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.08, type: "spring" }}
              className={`flex items-center gap-3 p-4 border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${bgClass} ${index === 0 ? "scale-[1.02]" : ""}`}
              data-testid={`row-leaderboard-${entry.playerId}`}
            >
              <div className="text-2xl font-black w-8 text-center shrink-0">
                {index === 0 ? <Star className="w-7 h-7 fill-current" /> : `#${entry.rank}`}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-black text-lg truncate" data-testid={`text-player-name-${entry.playerId}`}>
                  {entry.playerName}
                </div>
                {entry.roundsWon > 0 && (
                  <div className="flex items-center gap-1 text-xs font-bold opacity-70 mt-0.5">
                    <Medal className="w-3 h-3" /> {entry.roundsWon} {entry.roundsWon === 1 ? "win" : "wins"}
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                <div className="text-3xl font-black" data-testid={`text-score-${entry.playerId}`}>{entry.totalScore}</div>
                <div className="text-xs font-bold opacity-60">pts</div>
              </div>
            </motion.div>
          );
        })}

        {leaderboard.players.length === 0 && (
          <div className="text-center p-10 bg-white border-4 border-foreground card-neo">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <div className="text-xl font-black uppercase">No scores yet</div>
            <p className="text-sm mt-2 font-bold text-muted-foreground">Play rounds to see rankings!</p>
          </div>
        )}
      </div>
    </div>
  );
}

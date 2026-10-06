import { useParams } from "wouter";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Medal, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Eyebrow, GdgLockup, GDG_COLORS, glassColor, textColor, type GdgColor } from "@/components/gdg/brand";

const PODIUM: { place: number; color: GdgColor; height: string }[] = [
  { place: 2, color: "blue", height: "h-28 sm:h-36" },
  { place: 1, color: "yellow", height: "h-36 sm:h-48" },
  { place: 3, color: "red", height: "h-20 sm:h-28" },
];

export default function Leaderboard() {
  const { code } = useParams();
  const safeCode = code || "";

  const { data: leaderboard, isLoading } = useGetLeaderboard(safeCode, {
    query: { refetchInterval: 5000, enabled: !!safeCode }
  });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex justify-center items-center">
        <Loader2 className="w-10 h-10 animate-spin text-g-blue" />
      </div>
    );
  }

  if (!leaderboard) return null;

  const players = leaderboard.players;
  const rest = players.slice(3);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col px-4 sm:px-10 py-5">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/host/room/${safeCode}`} className="btn-ghost px-3.5 py-1.5 text-sm" data-testid="link-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="pill-blue tracking-[0.2em] font-semibold">{leaderboard.roomCode}</div>
      </div>

      <div className="mt-6 max-w-4xl w-full mx-auto">
        <Eyebrow color="yellow">Leaderboard</Eyebrow>
        <h1 className="mt-2 text-4xl sm:text-6xl font-extrabold text-paper">Prompt royalty</h1>
      </div>

      {players.length === 0 ? (
        <div className="glass mt-10 p-10 text-center max-w-md mx-auto w-full">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-white/40" />
          <div className="font-display text-2xl font-bold text-paper">No scores yet</div>
          <p className="text-sm mt-2 text-white/50">Play a round to crown someone.</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="mt-10 max-w-3xl w-full mx-auto grid grid-cols-3 gap-3 items-end">
            {PODIUM.map(({ place, color, height }) => {
              const entry = players[place - 1];
              return (
                <motion.div
                  key={place}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 * (3 - place), type: "spring", bounce: 0.35 }}
                  className="flex flex-col items-center text-center"
                >
                  {entry ? (
                    <>
                      <div className="font-semibold text-paper text-sm sm:text-lg truncate max-w-full px-1" data-testid={`text-player-name-${entry.playerId}`}>
                        {entry.playerName}
                      </div>
                      <div className={`font-display font-extrabold text-xl sm:text-3xl tabular-nums ${textColor[color]}`} data-testid={`text-score-${entry.playerId}`}>
                        {entry.totalScore}
                      </div>
                    </>
                  ) : (
                    <div className="text-white/30 text-sm">—</div>
                  )}
                  <div className={`${glassColor[color]} ${height} w-full mt-2 rounded-b-none flex items-start justify-center pt-3`}>
                    <span className={`font-display font-extrabold text-4xl sm:text-6xl ${textColor[color]}`}>{place}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* The rest */}
          {rest.length > 0 && (
            <div className="mt-6 max-w-3xl w-full mx-auto space-y-2">
              {rest.map((entry, index) => (
                <motion.div
                  key={entry.playerId}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="glass flex items-center gap-4 px-4 py-3"
                  data-testid={`row-leaderboard-${entry.playerId}`}
                >
                  <div className={`font-display font-extrabold text-xl w-10 ${textColor[GDG_COLORS[index % 4]]}`}>
                    {String(entry.rank).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-paper truncate" data-testid={`text-player-name-${entry.playerId}`}>{entry.playerName}</div>
                    {entry.roundsWon > 0 && (
                      <div className="flex items-center gap-1 text-xs text-white/50">
                        <Medal className="w-3 h-3" /> {entry.roundsWon} {entry.roundsWon === 1 ? "win" : "wins"}
                      </div>
                    )}
                  </div>
                  <div className="font-display text-2xl font-extrabold text-paper tabular-nums" data-testid={`text-score-${entry.playerId}`}>
                    {entry.totalScore}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-auto pt-10">
        <GdgLockup size="sm" />
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useJoinRoom } from "@workspace/api-client-react";
import { useLocalStorage } from "@/lib/hooks";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Join() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  
  const [, setStoredPlayerId] = useLocalStorage("prompt-game-player-id", 0);
  const [, setStoredPlayerName] = useLocalStorage("prompt-game-player-name", "");

  const joinRoom = useJoinRoom();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !playerName.trim()) return;

    const roomCode = code.toUpperCase().trim();

    joinRoom.mutate(
      { code: roomCode, data: { playerName } },
      {
        onSuccess: (player) => {
          setStoredPlayerId(player.id);
          setStoredPlayerName(player.name);
          setLocation(`/play/${roomCode}`);
        },
        onError: () => {
          toast({
            title: "Error joining room",
            description: "Check the code and try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-6 relative">
      <Link href="/" className="absolute top-6 left-6 btn-neo-white px-4 py-2 flex items-center gap-2 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card-neo w-full max-w-md p-8 bg-white"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black uppercase mb-2">Join Game</h1>
          <p className="font-medium text-muted-foreground">Enter room code to play</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xl font-bold uppercase tracking-wider">
              Room Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full input-neo text-3xl p-4 font-black text-center uppercase tracking-widest"
              placeholder="ABCD"
              required
              maxLength={4}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xl font-bold uppercase tracking-wider">
              Nickname
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full input-neo text-2xl p-4 font-bold"
              placeholder="CoolPlayer99"
              required
              maxLength={15}
            />
          </div>

          <button
            type="submit"
            disabled={joinRoom.isPending || !code.trim() || !playerName.trim()}
            className="w-full btn-neo-secondary text-2xl py-4 flex justify-center items-center gap-2"
          >
            {joinRoom.isPending ? (
              <Loader2 className="animate-spin w-8 h-8" />
            ) : (
              "Join Room"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useJoinRoom } from "@workspace/api-client-react";
import { useLocalStorage } from "@/lib/hooks";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Eyebrow, SlidePage } from "@/components/gdg/brand";

export default function Join() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // Allow /join?code=ABC123 so the host screen can share a direct link
  const [code, setCode] = useState(() =>
    (new URLSearchParams(window.location.search).get("code") ?? "").toUpperCase().slice(0, 6)
  );
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
            title: "Couldn't join the room",
            description: "Check the 6-character code and try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <SlidePage back="/">
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-md"
        >
          <Eyebrow color="green">Be active</Eyebrow>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold text-paper">Jump in</h1>
          <p className="mt-2 text-white/60">Step 01: show up. Step 02: participate. You're already halfway there.</p>

          <form onSubmit={handleJoin} className="glass-blue mt-6 p-5 space-y-5">
            <div className="space-y-2">
              <label className="eyebrow text-white/60 block">Room code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="field text-3xl p-4 font-display font-extrabold text-center uppercase tracking-[0.35em]"
                placeholder="ABC123"
                required
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                data-testid="input-room-code"
              />
            </div>

            <div className="space-y-2">
              <label className="eyebrow text-white/60 block">Nickname</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="field text-xl p-4 font-semibold"
                placeholder="FlutterFan99"
                required
                maxLength={15}
                data-testid="input-player-name"
              />
            </div>

            <button
              type="submit"
              disabled={joinRoom.isPending || code.trim().length !== 6 || !playerName.trim()}
              className="btn-gdg w-full text-lg py-4"
              data-testid="button-join"
            >
              {joinRoom.isPending ? <Loader2 className="animate-spin w-6 h-6" /> : "Join Room"}
            </button>
          </form>
        </motion.div>
      </div>
    </SlidePage>
  );
}

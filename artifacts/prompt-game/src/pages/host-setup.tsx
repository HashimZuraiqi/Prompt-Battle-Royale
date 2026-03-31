import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateRoom } from "@workspace/api-client-react";
import { useLocalStorage } from "@/lib/hooks";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function HostSetup() {
  const [, setLocation] = useLocation();
  const [hostName, setHostName] = useState("");
  const [, setStoredHost] = useLocalStorage("prompt-game-host", "");
  
  const createRoom = useCreateRoom();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;

    createRoom.mutate(
      { data: { hostName } },
      {
        onSuccess: (room) => {
          setStoredHost(hostName);
          setLocation(`/host/room/${room.code}`);
        },
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
          <h1 className="text-4xl font-black uppercase mb-2">Host Game</h1>
          <p className="font-medium text-muted-foreground">Create a room and invite players</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xl font-bold uppercase tracking-wider">
              Host Name
            </label>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full input-neo text-2xl p-4 font-bold"
              placeholder="e.g. GameMaster"
              required
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            disabled={createRoom.isPending || !hostName.trim()}
            className="w-full btn-neo text-2xl py-4 flex justify-center items-center gap-2"
          >
            {createRoom.isPending ? (
              <Loader2 className="animate-spin w-8 h-8" />
            ) : (
              "Create Room"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

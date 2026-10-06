import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateRoom } from "@workspace/api-client-react";
import { useLocalStorage } from "@/lib/hooks";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Eyebrow, SlidePage } from "@/components/gdg/brand";

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
    <SlidePage back="/">
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-md"
        >
          <Eyebrow color="red">Organizers only</Eyebrow>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold text-paper">Host the battle</h1>
          <p className="mt-2 text-white/60">Create a room, put it on the big screen and let the audience in.</p>

          <form onSubmit={handleCreate} className="glass-red mt-6 p-5 space-y-5">
            <div className="space-y-2">
              <label className="eyebrow text-white/60 block">Your name</label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="field text-xl p-4 font-semibold"
                placeholder="e.g. GDG PSUT Team"
                required
                maxLength={20}
                data-testid="input-host-name"
              />
            </div>

            <button
              type="submit"
              disabled={createRoom.isPending || !hostName.trim()}
              className="btn-gdg w-full text-lg py-4"
              data-testid="button-create-room"
            >
              {createRoom.isPending ? <Loader2 className="animate-spin w-6 h-6" /> : "Create Room"}
            </button>
          </form>
        </motion.div>
      </div>
    </SlidePage>
  );
}

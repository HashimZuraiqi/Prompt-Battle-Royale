import { Link } from "wouter";
import { motion } from "framer-motion";
import { Zap, Play, Crown } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 py-8 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-secondary rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-pulse pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-primary rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-pulse pointer-events-none" />

      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
        className="z-10 text-center w-full max-w-sm"
      >
        <div className="inline-flex items-center justify-center gap-2 bg-white border-4 border-foreground px-4 py-2 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-[-2deg]">
          <Zap className="text-primary fill-primary w-5 h-5" />
          <span className="font-bold text-base tracking-widest uppercase">Prompt Battle</span>
        </div>

        <h1 className="text-5xl font-black uppercase tracking-tighter leading-none mb-5 text-white [text-shadow:3px_3px_0_#111]">
          Master<br />The Machine
        </h1>

        <p className="text-base font-bold mb-8 max-w-xs mx-auto bg-white/90 p-3 border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          The real-time multiplayer game where you outsmart AI and your friends.
        </p>

        <div className="flex flex-col gap-4 w-full">
          <Link href="/join" className="w-full" data-testid="link-join">
            <motion.div
              whileTap={{ scale: 0.96 }}
              className="w-full px-6 py-5 text-xl btn-neo flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play fill="currentColor" className="w-5 h-5" />
              Join a Game
            </motion.div>
          </Link>

          <Link href="/host" className="w-full" data-testid="link-host">
            <motion.div
              whileTap={{ scale: 0.96 }}
              className="w-full px-6 py-5 text-xl btn-neo-secondary flex items-center justify-center gap-3 cursor-pointer"
            >
              <Crown fill="currentColor" className="w-5 h-5" />
              Host a Game
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

import { Link } from "wouter";
import { motion } from "framer-motion";
import { Zap, Play, Crown } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Background decorations */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-secondary rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
      <div className="absolute bottom-10 right-10 w-40 h-40 bg-primary rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
      
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
        className="z-10 text-center max-w-3xl"
      >
        <div className="inline-flex items-center justify-center space-x-2 bg-white border-4 border-foreground px-4 py-2 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-[-2deg]">
          <Zap className="text-primary fill-primary w-6 h-6" />
          <span className="font-bold text-lg tracking-widest uppercase">Prompt Battle</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6 drop-shadow-md text-white [text-shadow:4px_4px_0_#111]">
          Master <br/> The Machine
        </h1>
        
        <p className="text-xl md:text-2xl font-bold mb-12 max-w-xl mx-auto bg-white/90 p-4 border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          The real-time multiplayer game where you outsmart AI and your friends.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link href="/join" className="w-full sm:w-auto">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto px-10 py-5 text-2xl btn-neo flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play fill="currentColor" />
              Join a Game
            </motion.div>
          </Link>
          
          <Link href="/host" className="w-full sm:w-auto">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto px-10 py-5 text-2xl btn-neo-secondary flex items-center justify-center gap-3 cursor-pointer"
            >
              <Crown fill="currentColor" />
              Host a Game
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

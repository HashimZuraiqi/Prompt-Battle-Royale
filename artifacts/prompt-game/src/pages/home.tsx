import { Link } from "wouter";
import { motion } from "framer-motion";
import { Play, Crown } from "lucide-react";
import { Eyebrow, GdgLockup, GoogleColors, glassColor, textColor, type GdgColor } from "@/components/gdg/brand";

const STEPS: { n: string; title: string; text: string; color: GdgColor }[] = [
  { n: "01", title: "Join the room", text: "Grab the 6-character code from the big screen.", color: "blue" },
  { n: "02", title: "Read the challenge", text: "GDG trivia, campus chaos or real-life tasks.", color: "red" },
  { n: "03", title: "Write your prompt", text: "Beat the clock with your sharpest prompt.", color: "yellow" },
  { n: "04", title: "AI judges", text: "Scores, feedback and a live leaderboard.", color: "green" },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col px-4 sm:px-10 py-6 sm:py-8">
      <GdgLockup />

      <div className="flex-1 flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16 py-10">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex-1 max-w-2xl"
        >
          <Eyebrow color="blue">Info Session · Live Game</Eyebrow>
          <h1 className="mt-4 font-display font-extrabold uppercase leading-[0.9] text-paper text-[17vw] sm:text-7xl lg:text-8xl">
            Prompt
            <br />
            Battle
          </h1>
          <div className="font-display font-extrabold leading-none text-[22vw] sm:text-8xl lg:text-9xl mt-1">
            <GoogleColors text="2026" />
          </div>
          <p className="mt-6 text-lg text-white/70 max-w-md">
            Learn it, build it, <span className="text-g-green">prompt it</span>. Outsmart the AI and everyone in the room.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:max-w-md">
            <Link href="/join" className="flex-1" data-testid="link-join">
              <motion.div whileTap={{ scale: 0.97 }} className="btn-gdg w-full px-7 py-4 text-lg cursor-pointer">
                <Play className="w-5 h-5 fill-current" /> Join Now
              </motion.div>
            </Link>
            <Link href="/host" className="sm:w-44" data-testid="link-host">
              <motion.div whileTap={{ scale: 0.97 }} className="btn-ghost w-full px-6 py-4 text-base cursor-pointer">
                <Crown className="w-4 h-4" /> Host
              </motion.div>
            </Link>
          </div>
        </motion.div>

        <div className="flex-1 max-w-xl w-full">
          <Eyebrow color="yellow">Tonight</Eyebrow>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-paper">How it works</h2>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className={`${glassColor[s.color]} p-4`}
              >
                <div className="flex items-baseline gap-3">
                  <span className={`font-display text-2xl font-extrabold ${textColor[s.color]}`}>{s.n}</span>
                  <span className="font-semibold text-paper text-lg">{s.title}</span>
                </div>
                <p className="mt-1 text-sm text-white/60">{s.text}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="pill-blue">AI Agents</span>
            <span className="pill-red">Flutter</span>
            <span className="pill-yellow">Vibe Coding</span>
            <span className="pill-green">Docker 101</span>
            <span className="pill-blue">Git Started</span>
          </div>
        </div>
      </div>

      <div className="text-sm text-white/50">
        No application needed. <span className="text-g-yellow">Just show up and get involved.</span>
      </div>
    </div>
  );
}

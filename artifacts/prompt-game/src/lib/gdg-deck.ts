import type { GdgColor } from "@/components/gdg/brand";

export type DeckTrack = "gdg" | "fun" | "general";

export interface DeckChallenge {
  id: string;
  track: DeckTrack;
  /** Short label shown to players as the round "category". */
  category: string;
  /** The task players must write a prompt for. */
  task: string;
}

export const TRACKS: { id: DeckTrack; label: string; blurb: string; color: GdgColor }[] = [
  { id: "gdg", label: "GDG PSUT", blurb: "Straight from tonight's slides", color: "blue" },
  { id: "fun", label: "Just for fun", blurb: "Chaos, memes and campus life", color: "red" },
  { id: "general", label: "General", blurb: "Real-life prompting skills", color: "green" },
];

/**
 * Every challenge is a prompt-writing task: players write the prompt they would
 * give an AI to get the described result, and the AI judge scores the prompt.
 * GDG challenges use facts from the Info Session 2026 deck so good prompts
 * should include the right details.
 */
export const DECK: DeckChallenge[] = [
  // ── GDG PSUT ───────────────────────────────────────────────────────────
  {
    id: "gdg-freshman",
    track: "gdg",
    category: "Who We Are",
    task: "Get an AI to explain what GDG on Campus PSUT is to a first-year student from any major, in under 60 words.",
  },
  {
    id: "gdg-flutter-caption",
    track: "gdg",
    category: "Hype Caption",
    task: "Get an AI to write an Instagram caption for the Flutter Bootcamp: 3 sessions, Loay Shammout Auditorium, 24/10, 31/10 and 7/11.",
  },
  {
    id: "gdg-mission-rap",
    track: "gdg",
    category: "Mission Remix",
    task: "Get an AI to turn our mission, \"bridging the gap between theory and practice\", into a 4-line rap verse.",
  },
  {
    id: "gdg-trailer",
    track: "gdg",
    category: "Origin Story",
    task: "Get an AI to write a movie-trailer voiceover about GDSC PSUT, founded in 2019, growing into 1,000+ members and 17 organizers.",
  },
  {
    id: "gdg-track-quiz",
    track: "gdg",
    category: "Track Matchmaker",
    task: "Get an AI to build a 5-question quiz that sorts a student into one of our 6 tracks: AI & ML, Cloud & DevOps, Flutter, Web & Backend, Cybersecurity, Dev tools & careers.",
  },
  {
    id: "gdg-bring-friend",
    track: "gdg",
    category: "Bring a Friend",
    task: "Get an AI to write a WhatsApp message that convinces your friend to come to the next GDG PSUT workshop. Remember: no application needed.",
  },
  {
    id: "gdg-chant",
    track: "gdg",
    category: "Team Spirit",
    task: "Get an AI to write a stadium chant for the 17 GDG PSUT organizers in their black hoodies.",
  },
  {
    id: "gdg-mock-interview",
    track: "gdg",
    category: "Internship Panel",
    task: "Get an AI to act as a tough-but-kind mock interviewer for a student going for their first tech internship.",
  },
  {
    id: "gdg-flutter-pitch",
    track: "gdg",
    category: "Why Flutter",
    task: "Get an AI to write a 30-second pitch for Flutter: one codebase, every screen, made by Google, trusted by BMW, Toyota and Alibaba.",
  },
  {
    id: "gdg-docker-shawarma",
    track: "gdg",
    category: "Docker 101",
    task: "Get an AI to explain Docker images vs containers using only shawarma-shop analogies.",
  },
  {
    id: "gdg-git-drama",
    track: "gdg",
    category: "Git Started",
    task: "Get an AI to explain a git merge conflict as a dramatic family argument at a Friday lunch.",
  },
  {
    id: "gdg-neural-football",
    track: "gdg",
    category: "Neural Networks",
    task: "Get an AI to explain how a neural network learns, to a 10-year-old, using football.",
  },
  {
    id: "gdg-ctf-story",
    track: "gdg",
    category: "CTF Challenge",
    task: "Get an AI to design a beginner-friendly CTF puzzle whose story is set on the PSUT campus.",
  },
  {
    id: "gdg-roadmap",
    track: "gdg",
    category: "Year Roadmap",
    task: "Get an AI to turn this year's events (Flutter Bootcamp, Technical Sessions, Hands-on Workshops, Internship Panel) into a one-page roadmap poster brief.",
  },
  {
    id: "gdg-get-involved",
    track: "gdg",
    category: "Be Active",
    task: "Get an AI to write a 4-step comic strip script for \"Show up, Participate, Share, Grow\" starring a shy freshman.",
  },
  {
    id: "gdg-hoodie-drop",
    track: "gdg",
    category: "Merch Drop",
    task: "Get an AI to announce a limited-edition GDG PSUT hoodie like it's a hyped sneaker release.",
  },

  // ── Just for fun ───────────────────────────────────────────────────────
  {
    id: "fun-8am",
    track: "fun",
    category: "Excuse Generator",
    task: "Get an AI to invent the most believable excuse for missing an 8 AM lecture.",
  },
  {
    id: "fun-mansaf-drone",
    track: "fun",
    category: "Startup Pitch",
    task: "Get an AI to pitch a startup that delivers mansaf by drone to university students.",
  },
  {
    id: "fun-works-on-my-machine",
    track: "fun",
    category: "Shakespeare Mode",
    task: "Get an AI to rewrite \"it works on my machine\" as a Shakespearean monologue.",
  },
  {
    id: "fun-demo-bug",
    track: "fun",
    category: "Villain Origin",
    task: "Get an AI to write the villain origin story of the bug that only appears during live demos.",
  },
  {
    id: "fun-cat-app",
    track: "fun",
    category: "App Idea",
    task: "Get an AI to design an app where cats rate their humans.",
  },
  {
    id: "fun-lang-horoscope",
    track: "fun",
    category: "Dev Horoscopes",
    task: "Get an AI to write this week's horoscope for Python, JavaScript and C++.",
  },
  {
    id: "fun-coffee-bug",
    track: "fun",
    category: "Bug Report",
    task: "Get an AI to write a formal, very serious bug report about the campus coffee machine.",
  },
  {
    id: "fun-breakup",
    track: "fun",
    category: "Breakup Song",
    task: "Get an AI to write a breakup song from a developer to their old laptop.",
  },
  {
    id: "fun-parking",
    track: "fun",
    category: "Campus Life",
    task: "Get an AI to narrate finding a parking spot at university like a nature documentary.",
  },
  {
    id: "fun-emoji",
    track: "fun",
    category: "Emoji Only",
    task: "Get an AI to tell the story of your first hackathon using only emojis, then translate it.",
  },

  // ── General ────────────────────────────────────────────────────────────
  {
    id: "gen-study-plan",
    track: "general",
    category: "Study Planner",
    task: "Get an AI to build a realistic one-week finals study plan for someone with only 3 free hours a day.",
  },
  {
    id: "gen-cv-bullet",
    track: "general",
    category: "CV Glow-up",
    task: "Get an AI to turn \"I made a website for a club\" into a strong CV bullet for a software internship.",
  },
  {
    id: "gen-grandma-internet",
    track: "general",
    category: "Explain Simply",
    task: "Get an AI to explain how the internet works to your grandmother.",
  },
  {
    id: "gen-landing-page",
    track: "general",
    category: "Vibe Coding",
    task: "Get an AI coding assistant to build a landing page for a student-run tech event.",
  },
  {
    id: "gen-hint-tutor",
    track: "general",
    category: "Debug Buddy",
    task: "Get an AI to act as a tutor that gives hints, never answers, while you fix a bug.",
  },
  {
    id: "gen-linkedin",
    track: "general",
    category: "LinkedIn Post",
    task: "Get an AI to write a LinkedIn post about your first workshop that doesn't sound cringe.",
  },
  {
    id: "gen-email-prof",
    track: "general",
    category: "Polite Email",
    task: "Get an AI to write an email asking your professor for a deadline extension, honestly and politely.",
  },
  {
    id: "gen-secure-password",
    track: "general",
    category: "Cyber Basics",
    task: "Get an AI to teach your family 3 rules for spotting phishing messages.",
  },
];

export function deckByTrack(track: DeckTrack) {
  return DECK.filter((c) => c.track === track);
}

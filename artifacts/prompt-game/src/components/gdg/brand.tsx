import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

/** The GDG "< >" bracket mark, drawn in two blues like the deck. */
export function GdgLogo({ className = "w-10 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="gdg-l" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e90ff" />
          <stop offset="1" stopColor="#1a73e8" />
        </linearGradient>
        <linearGradient id="gdg-r" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a73e8" />
          <stop offset="1" stopColor="#2a4fd0" />
        </linearGradient>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="15">
        <path d="M44 9 L14 32 L44 55" stroke="url(#gdg-l)" />
        <path d="M76 9 L106 32 L76 55" stroke="url(#gdg-r)" />
      </g>
      <g fill="#7fd0ff">
        <rect x="20" y="28.5" width="6" height="6" transform="rotate(45 23 31.5)" />
        <rect x="30" y="28.5" width="6" height="6" transform="rotate(45 33 31.5)" />
        <rect x="84" y="28.5" width="6" height="6" transform="rotate(45 87 31.5)" />
        <rect x="94" y="28.5" width="6" height="6" transform="rotate(45 97 31.5)" />
      </g>
    </svg>
  );
}

/** "Google Developer Group | Princess Sumaya University" lockup. */
export function GdgLockup({ size = "md" }: { size?: "sm" | "md" }) {
  const sm = size === "sm";
  return (
    <div className="flex items-center gap-2.5 select-none">
      <GdgLogo className={sm ? "w-9 h-5" : "w-12 h-7"} />
      <div className="border-l border-white/40 pl-2.5 leading-none">
        <div className={`${sm ? "text-[12px]" : "text-[15px]"} font-medium text-paper tracking-tight`}>
          Google Developer Group
        </div>
        <div className={`${sm ? "text-[8.5px]" : "text-[10.5px]"} mt-1 font-medium tracking-[0.18em] text-[#2f7bff]`}>
          Princess Sumaya University
        </div>
      </div>
    </div>
  );
}

export type GdgColor = "blue" | "red" | "yellow" | "green";

export const textColor: Record<GdgColor, string> = {
  blue: "text-g-blue",
  red: "text-g-red",
  yellow: "text-g-yellow",
  green: "text-g-green",
};

export const glassColor: Record<GdgColor, string> = {
  blue: "glass-blue",
  red: "glass-red",
  yellow: "glass-yellow",
  green: "glass-green",
};

export const pillColor: Record<GdgColor, string> = {
  blue: "pill-blue",
  red: "pill-red",
  yellow: "pill-yellow",
  green: "pill-green",
};

export const GDG_COLORS: GdgColor[] = ["blue", "red", "yellow", "green"];

export function Eyebrow({ color = "blue", children }: { color?: GdgColor; children: ReactNode }) {
  return <div className={`eyebrow ${textColor[color]}`}>{children}</div>;
}

/** "2026" with each digit in a Google color — reusable for any short string. */
export function GoogleColors({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split("").map((ch, i) => (
        <span key={i} className={textColor[GDG_COLORS[i % 4]]}>
          {ch}
        </span>
      ))}
    </span>
  );
}

/**
 * Slide-style page: lockup bottom-left, page number bottom-right,
 * optional back link top-left.
 */
export function SlidePage({
  children,
  back,
  pageNo,
  className = "",
}: {
  children: ReactNode;
  back?: string;
  pageNo?: string | number;
  className?: string;
}) {
  return (
    <div className={`min-h-[100dvh] w-full flex flex-col px-4 sm:px-10 pt-5 pb-5 ${className}`}>
      {back && (
        <div className="mb-4">
          <Link href={back} className="btn-ghost px-3.5 py-1.5 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      )}
      <div className="flex-1 flex flex-col">{children}</div>
      <footer className="mt-8 flex items-end justify-between">
        <GdgLockup size="sm" />
        {pageNo !== undefined && (
          <div className="text-sm text-white/40 tabular-nums">{String(pageNo).padStart(2, "0")}</div>
        )}
      </footer>
    </div>
  );
}

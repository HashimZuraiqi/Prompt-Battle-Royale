import { Link } from "wouter";
import { Eyebrow, GoogleColors, SlidePage } from "@/components/gdg/brand";

export default function NotFound() {
  return (
    <SlidePage>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        <div className="font-display font-extrabold text-8xl sm:text-9xl leading-none">
          <GoogleColors text="404" />
        </div>
        <Eyebrow color="red">Page not found</Eyebrow>
        <p className="text-white/60 max-w-sm">This page skipped the info session. Let's get you back.</p>
        <Link href="/" className="btn-gdg px-7 py-3 mt-2">Go home</Link>
      </div>
    </SlidePage>
  );
}

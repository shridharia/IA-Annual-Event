import { ArrowUp } from "lucide-react";
import { event } from "@/content/event";
import { formatClock, longDate } from "@/lib/time";
import AddToCalendar from "@/components/ui/AddToCalendar";

export default function Closing() {
  return (
    <footer id="closing" className="relative overflow-hidden pt-[var(--section-y)]" aria-labelledby="closing-h">
      <div className="absolute inset-x-0 bottom-0 top-1/3 -z-10" style={{ background: "radial-gradient(60% 60% at 50% 100%, rgba(38,76,215,.5), transparent 70%)" }} aria-hidden />
      <div className="wrap text-center">
        <p className="label mb-6" data-reveal="up">{event.organization}</p>
        <h2 id="closing-h" className="serif mx-auto max-w-4xl text-[clamp(2.2rem,7vw,6rem)] leading-[1.05]" data-reveal="mask" data-split="lines">
          Eleven years. One more evening to remember.
        </h2>
        <p className="lead mt-8" data-reveal="up">
          {longDate(event.date)}{event.startTime ? ` · ${formatClock(event.startTime)} IST` : ""}<br />
          <span className="text-dim">{event.venue.name}, {event.venue.city}</span>
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3" data-reveal="up">
          <a className="btn btn-primary" href={event.venue.mapsUrl} target="_blank" rel="noopener noreferrer">Get directions</a>
          <AddToCalendar />
          <a className="btn btn-ghost" href="#updates">Enable updates</a>
        </div>
      </div>
      <div className="closing-11 mt-12" aria-hidden><span>1</span><span>1</span></div>
      <div className="wrap flex flex-wrap items-center justify-between gap-4 border-t border-white/15 py-6 text-sm text-dim">
        <p>© {new Date().getFullYear()} {event.organization}</p>
        <a href="#top" className="inline-flex min-h-11 items-center gap-2 font-bold text-bone no-underline">Back to top <ArrowUp size={16} aria-hidden /></a>
      </div>
    </footer>
  );
}

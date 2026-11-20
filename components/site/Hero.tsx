import { ArrowDown } from "lucide-react";
import { event } from "@/content/event";
import { formatClock, longDate } from "@/lib/time";
import AddToCalendar from "@/components/ui/AddToCalendar";

/** The Doorway: two monolithic 1s with a lit gap. Decorative glyphs are aria-hidden; the h1 carries the real text. */
export default function Hero() {
  return (
    <section id="top" className="hero" data-doorway aria-labelledby="hero-title">
      <div className="monoliths" aria-hidden="true" data-light>
        <span className="mono-1" data-door data-reveal="hero">1</span>
        <span className="beam" data-beam data-reveal="hero" />
        <span className="mono-1" data-door data-reveal="hero">1</span>
      </div>

      <div className="hero-info">
        <div data-hero-in data-reveal="hero">
          <p className="label mb-3">{event.organization} presents</p>
          <h1 id="hero-title" className="display hero-title">
            <span className="sr-only">{event.years} </span>Years of Impact
          </h1>
        </div>
        <div className="hero-meta" data-hero-in data-reveal="hero">
          <strong>{longDate(event.date)}{event.startTime ? ` · ${formatClock(event.startTime)} IST` : ""}</strong>
          <span className="text-dim">{event.venue.name}, {event.venue.city}</span>
        </div>
        <div className="hero-actions" data-hero-in data-reveal="hero">
          <a href="#celebration" className="btn btn-primary">Explore the event <ArrowDown size={18} className="arrow" aria-hidden /></a>
          <AddToCalendar />
        </div>
      </div>
    </section>
  );
}

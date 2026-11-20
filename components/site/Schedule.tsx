import { MapPin, User } from "lucide-react";
import { event } from "@/content/event";
import { formatClock } from "@/lib/time";
import Chapter from "@/components/ui/Chapter";

export default function Schedule() {
  const items = event.schedule;
  return (
    <section id="schedule" className="section" aria-labelledby="schedule-h">
      <div className="wrap">
        <Chapter n="03" label="Schedule" />
        <h2 id="schedule-h" className="display mb-12" style={{ fontSize: "var(--fs-display)" }} data-reveal="mask" data-split="lines">The evening, hour by hour</h2>

        {items.length === 0 ? (
          <div className="measure border-y border-white/15 py-10" data-reveal="up">
            <p className="lead">The agenda is being finalised.</p>
            <p className="mt-2 text-dim">Sessions will appear here the moment they&apos;re confirmed, and we&apos;ll send a notification if you&apos;ve enabled updates.</p>
            {process.env.NODE_ENV !== "production" && <p className="placeholder-note mt-4">Dev: add items to schedule[] in content/event.ts</p>}
          </div>
        ) : (
          <ol className="timeline measure-none max-w-4xl" aria-label="Event schedule">
            <span className="timeline-line" data-draw aria-hidden />
            <div data-reveal="stagger">
              {items.map((s, i) => (
                <li key={i} className={`t-item ${s.highlight ? "key" : ""}`}>
                  <div>
                    <span className="t-time">{s.time ? formatClock(s.time) : "TBA"}</span>
                    {s.highlight && <span className="label mt-1 block !text-flare">Key moment</span>}
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold leading-snug md:text-2xl">{s.title}</h3>
                    {s.description && <p className="mt-2 text-dim">{s.description}</p>}
                    {(s.speaker || s.location) && (
                      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        {s.speaker && <span className="inline-flex items-center gap-1.5"><User size={14} aria-hidden /> {s.speaker}</span>}
                        {s.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} aria-hidden /> {s.location}</span>}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </div>
          </ol>
        )}
      </div>
    </section>
  );
}

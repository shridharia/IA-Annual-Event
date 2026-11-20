"use client";
import { useEffect, useState } from "react";
import { event } from "@/content/event";
import { istToDate, remaining, type Remaining } from "@/lib/time";

// Target is computed in Asia/Kolkata → identical for every viewer regardless of their own timezone.
// No startTime ⇒ we count to the START of the event day (00:00 IST) and say so, instead of implying a time.
const target = istToDate(event.date, event.startTime ?? "00:00")!;
const units: [keyof Remaining, string][] = [["days", "Days"], ["hours", "Hours"], ["minutes", "Minutes"], ["seconds", "Seconds"]];
const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export default function Countdown() {
  const [r, setR] = useState<Remaining | null>(null);
  useEffect(() => {
    const tick = () => setR(remaining(target, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    const vis = () => !document.hidden && tick(); // resync after tab/background throttling
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, []);

  if (r?.done) {
    return (
      <div className="border-y border-white/15 py-16 text-center" role="status">
        <p className="display" style={{ fontSize: "var(--fs-display)" }}>It&apos;s time.</p>
        <p className="lead mt-3 text-dim">{event.title} is here. See you at {event.venue.name}.</p>
      </div>
    );
  }

  const label = r
    ? `${r.days} days, ${r.hours} hours, ${r.minutes} minutes and ${r.seconds} seconds remaining`
    : "Countdown loading";
  return (
    <div>
      <div className="cd-grid" role="timer" aria-label={label}>
        {units.map(([k, name]) => (
          <div className="cd-cell" key={k}>
            <span className="cd-num" aria-hidden>
              {/* key=value restarts the CSS tick animation each time the digit changes */}
              <span key={r ? r[k] as number : "x"}>{r ? pad(r[k] as number, k === "days" ? (r.days > 99 ? 3 : 2) : 2) : "––"}</span>
            </span>
            <span className="label mt-2 block">{name}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-dim">
        {event.startTime ? "Counting down to the event start (IST)." : "Counting down to the start of the day, 17 December (IST). The start time will be announced."}
      </p>
    </div>
  );
}

"use client";
import { useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { CalendarPlus, Download } from "lucide-react";
import { event } from "@/content/event";
import { ui } from "@/lib/motion/presets";

const ymd = (d: string) => d.replaceAll("-", "");
const nextDay = (d: string) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10).replaceAll("-", ""); };
const loc = [event.venue.name, event.venue.address, event.venue.city, event.venue.country].filter(Boolean).join(", ");

/** With no confirmed start time this is an ALL-DAY entry, so we never imply a time that hasn't been announced. */
function dates() {
  if (!event.startTime) return { start: ymd(event.date), end: nextDay(event.date), allDay: true };
  const t = `${ymd(event.date)}T${event.startTime.replace(":", "")}00`;
  return { start: t, end: t, allDay: false };
}

function ics() {
  const d = dates();
  const esc = (s: string) => s.replace(/[,;\\]/g, (c) => `\\${c}`);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Impact Analytics//11 Years of Impact//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:impact-11-years-${event.date}@impactanalytics`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    d.allDay ? `DTSTART;VALUE=DATE:${d.start}` : `DTSTART;TZID=${event.timezone}:${d.start}`,
    d.allDay ? `DTEND;VALUE=DATE:${d.end}` : "",
    `SUMMARY:${esc(event.title)}`, `LOCATION:${esc(loc)}`,
    `DESCRIPTION:${esc(`${event.title} by ${event.organization}. Directions: ${event.venue.mapsUrl}`)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

function googleUrl() {
  const d = dates();
  const p = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${d.start}/${d.end}`, location: loc, details: `Directions: ${event.venue.mapsUrl}` });
  if (!d.allDay) p.set("ctz", event.timezone);
  return `https://calendar.google.com/calendar/render?${p}`;
}

export default function AddToCalendar({ variant = "ghost" }: { variant?: "ghost" | "primary" }) {
  const [open, setOpen] = useState(false);
  const download = () => {
    const url = URL.createObjectURL(new Blob([ics()], { type: "text/calendar;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "11-years-of-impact.ics" });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setOpen(false);
  };
  return (
    <LazyMotion features={domAnimation}>
      <div className="relative">
        <button className={`btn ${variant === "primary" ? "btn-primary" : "btn-ghost"}`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
          <CalendarPlus size={18} aria-hidden /> Add to calendar
        </button>
        <AnimatePresence>
          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
              <m.div role="menu" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={ui.step}
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                className="absolute bottom-full right-0 z-50 mb-2 w-64 overflow-hidden rounded-2xl border border-white/15 bg-ink-2 p-1 shadow-2xl max-md:left-0 max-md:right-auto">
                <a role="menuitem" href={googleUrl()} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold no-underline hover:bg-white/5" onClick={() => setOpen(false)}>Google Calendar</a>
                <button role="menuitem" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold hover:bg-white/5" onClick={download}><Download size={16} aria-hidden /> Apple / Outlook (.ics)</button>
                {!event.startTime && <p className="px-4 pb-3 pt-1 text-xs text-dim">Saved as an all-day entry until the start time is announced.</p>}
              </m.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Bell, CalendarClock, House, MapPin, Sparkles } from "lucide-react";

const links = [
  { id: "top", label: "Home", icon: House },
  { id: "celebration", label: "Story", icon: Sparkles },
  { id: "schedule", label: "Schedule", icon: CalendarClock },
  { id: "venue", label: "Venue", icon: MapPin },
  { id: "updates", label: "Updates", icon: Bell },
];
const desktopExtra = [{ id: "countdown", label: "Countdown" }, { id: "info", label: "Info" }];

export default function Nav() {
  const [active, setActive] = useState("top");

  useEffect(() => {
    const ids = ["top", "celebration", "countdown", "schedule", "venue", "info", "updates", "closing"];
    const els = ids.map((i) => document.getElementById(i)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const desktop = [...links, ...desktopExtra].sort((a, b) => ["top","celebration","countdown","schedule","venue","info","updates"].indexOf(a.id) - ["top","celebration","countdown","schedule","venue","info","updates"].indexOf(b.id));
  const cur = (id: string) => (active === id || (id === "updates" && active === "closing") ? "true" : undefined);

  return (
    <>
      <header className="topbar">
        <nav aria-label="Sections" className="wrap flex h-16 items-center justify-between">
          <a href="#top" aria-label="11 Years of Impact — top" className="display text-2xl text-bone no-underline">11<span className="text-flare">.</span></a>
          <div className="flex gap-6">
            {desktop.map((l) => (
              <a key={l.id} href={`#${l.id}`} className="link" aria-current={cur(l.id)}>{l.label}</a>
            ))}
          </div>
        </nav>
      </header>
      <nav aria-label="Sections" className="dock">
        {links.map(({ id, label, icon: Icon }) => (
          <a key={id} href={`#${id}`} aria-current={cur(id)}>
            <Icon size={18} aria-hidden />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}

import { event } from "@/content/event";
import Chapter from "@/components/ui/Chapter";

export default function Celebration() {
  const c = event.celebration;
  return (
    <section id="celebration" className="section" aria-labelledby="celebration-h">
      <div className="wrap">
        <Chapter n="01" label={c.eyebrow} />
        <h2 id="celebration-h" className="sr-only">{c.eyebrow}</h2>
        <p className="statement" data-scrub-words>{c.statement}</p>
        <div className="mt-16 grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
          <div className="display text-flare" style={{ fontSize: "clamp(5rem, 22vw, 16rem)" }} aria-hidden data-parallax="0.08">
            {event.years}
          </div>
          <div className="measure self-end text-dim lead" data-reveal="stagger">
            {c.body.map((p, i) => <p key={i} className="mb-5">{p}</p>)}
          </div>
        </div>
      </div>
    </section>
  );
}

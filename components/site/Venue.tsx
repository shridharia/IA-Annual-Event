import Image from "next/image";
import { ArrowUpRight, Car, Compass, TrainFront } from "lucide-react";
import { event } from "@/content/event";
import Chapter from "@/components/ui/Chapter";

const dev = process.env.NODE_ENV !== "production";

function Fact({ icon: Icon, label, value }: { icon: typeof Car; label: string; value: string | null }) {
  if (!value && !dev) return null; // unconfirmed details are never published
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4">
      <Icon size={20} className="mt-1 text-flare" aria-hidden />
      <div>
        <h3 className="label">{label}</h3>
        {value ? <p className="mt-1">{value}</p> : <p className="placeholder-note mt-1">Awaiting confirmation</p>}
      </div>
    </div>
  );
}

export default function Venue() {
  const v = event.venue;
  return (
    <section id="venue" className="section" aria-labelledby="venue-h">
      <div className="wrap">
        <Chapter n="04" label="Venue" />
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div>
            <h2 id="venue-h" className="display" style={{ fontSize: "var(--fs-display)" }} data-reveal="mask" data-split="lines">{v.name}</h2>
            <p className="serif mt-4 text-3xl text-volt md:text-4xl" data-reveal="up">{v.city}, {v.country}</p>
            {v.address ? <address className="mt-6 text-lg not-italic text-dim" data-reveal="up">{v.address}</address>
              : dev && <p className="placeholder-note mt-6">Street address awaiting confirmation</p>}
            <div className="mt-8 flex flex-wrap gap-3" data-reveal="up">
              <a className="btn btn-primary" href={v.mapsUrl} target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={18} className="arrow" aria-hidden /></a>
            </div>
          </div>

          <div className="grid content-start gap-8" data-reveal="stagger">
            {v.photo ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image src={v.photo} alt={`${v.name}`} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" />
              </div>
            ) : (
              /* Venue photography must be licensed/provided; until then a typographic panel stands in. */
              <div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-xl border border-white/15 bg-ink-2 p-6" aria-hidden>
                <div className="display absolute -right-4 -top-6 select-none text-[9rem] leading-none text-white/[0.06]">HE</div>
                <p className="label">{v.name}</p>
              </div>
            )}
            <Fact icon={Compass} label="Arrival" value={v.arrival} />
            <Fact icon={Car} label="Parking" value={v.parking} />
            <Fact icon={TrainFront} label="Getting there" value={v.transport} />
          </div>
        </div>
      </div>
    </section>
  );
}

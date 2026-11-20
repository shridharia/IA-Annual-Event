import { event } from "@/content/event";

/** Approximate layouts only — real rendering varies by OS version, browser and user settings. */
export default function Preview({ title, body, image }: { title: string; body: string; image?: string }) {
  const t = title || "Notification title", b = body || "Your message appears here.";
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-label="Notification previews">
      <figure>
        <figcaption className="label mb-2">Android (approx.)</figcaption>
        <div className="rounded-2xl bg-[#2b2d33] p-3 text-[#e8eaed]">
          <div className="mb-1 flex items-center gap-2 text-[11px] text-[#9aa0a6]"><span className="grid h-4 w-4 place-items-center rounded-full bg-flare text-[8px] font-black text-ink">11</span>{event.shortTitle} · now</div>
          <p className="text-sm font-bold leading-tight">{t}</p>
          <p className="text-sm leading-snug text-[#c4c7c5]">{b}</p>
          {image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={image} alt="" className="mt-2 h-28 w-full rounded-lg object-cover" />}
        </div>
      </figure>
      <figure>
        <figcaption className="label mb-2">iOS (approx.)</figcaption>
        <div className="flex gap-3 rounded-[1.4rem] bg-[#e9e9ee]/90 p-3 text-black backdrop-blur">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-xs font-black text-flare">11</span>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-[13px]"><p className="font-semibold">{t}</p><span className="text-black/50">now</span></div>
            <p className="text-[13px] leading-snug text-black/80">{b}</p>
          </div>
        </div>
      </figure>
    </div>
  );
}

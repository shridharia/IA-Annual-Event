import { Mail, Phone } from "lucide-react";
import { event } from "@/content/event";
import Chapter from "@/components/ui/Chapter";

const dev = process.env.NODE_ENV !== "production";

export default function Info() {
  const fields = event.info.filter((f) => f.value || dev);
  const { contact, faqs, announcementLinks } = event;
  const hasContact = contact.name || contact.email || contact.phone;
  const empty = !fields.length && !faqs.length && !hasContact && !announcementLinks.length;

  return (
    <section id="info" className="section !pt-0" aria-labelledby="info-h">
      <div className="wrap">
        <Chapter n="05" label="Good to know" />
        <h2 id="info-h" className="display mb-12" style={{ fontSize: "var(--fs-display)" }} data-reveal="mask" data-split="lines">Before you arrive</h2>

        {empty ? (
          <p className="lead measure text-dim" data-reveal="up">Dress code, arrival and registration details will be published here and sent as notifications.</p>
        ) : (
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            <dl className="rows" data-reveal="stagger">
              {fields.map((f) => (
                <div key={f.label} className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-6">
                  <dt className="label pt-1">{f.label}</dt>
                  <dd>{f.value ?? <span className="placeholder-note">Awaiting confirmation</span>}</dd>
                </div>
              ))}
              {hasContact && (
                <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-6">
                  <dt className="label pt-1">Event contact</dt>
                  <dd className="grid gap-2">
                    {contact.name && <span>{contact.name}</span>}
                    {contact.email && <a className="inline-flex min-h-11 items-center gap-2 text-volt" href={`mailto:${contact.email}`}><Mail size={16} aria-hidden /> {contact.email}</a>}
                    {contact.phone && <a className="inline-flex min-h-11 items-center gap-2 text-volt" href={`tel:${contact.phone.replace(/\s/g, "")}`}><Phone size={16} aria-hidden /> {contact.phone}</a>}
                  </dd>
                </div>
              )}
              {announcementLinks.map((l) => (
                <div key={l.href}><a className="font-bold text-volt underline-offset-4 hover:underline" href={l.href}>{l.label} →</a></div>
              ))}
            </dl>

            {faqs.length > 0 && (
              <div className="rows" data-reveal="stagger" role="list" aria-label="Frequently asked questions">
                {faqs.map((f) => (
                  <details key={f.q} className="faq" role="listitem">
                    <summary>{f.q}<span className="plus" aria-hidden>+</span></summary>
                    <p className="mt-3 pr-8 text-dim">{f.a}</p>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

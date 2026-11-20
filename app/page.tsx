import Nav from "@/components/ui/Nav";
import Hero from "@/components/site/Hero";
import Celebration from "@/components/site/Celebration";
import CountdownSection from "@/components/site/CountdownSection";
import Schedule from "@/components/site/Schedule";
import Venue from "@/components/site/Venue";
import Info from "@/components/site/Info";
import Updates from "@/components/site/Updates";
import Closing from "@/components/site/Closing";
import { event } from "@/content/event";
import { istToDate } from "@/lib/time";

// Fully static: pre-rendered at build time. Dynamic data lives only behind /api and /organizer.
export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Event", name: event.title,
    startDate: event.startTime ? istToDate(event.date, event.startTime)!.toISOString() : event.date,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.venue.name, address: { "@type": "PostalAddress", addressLocality: event.venue.city, addressCountry: "IN", ...(event.venue.address ? { streetAddress: event.venue.address } : {}) } },
    organizer: { "@type": "Organization", name: event.organization },
  };
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Celebration />
        <CountdownSection />
        <Schedule />
        <Venue />
        <Info />
        <Updates />
      </main>
      <Closing />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}

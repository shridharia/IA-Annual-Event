import type { Metadata } from "next";
import { event } from "@/content/event";
import { longDate } from "@/lib/time";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

export default function Offline() {
  return (
    <main className="grid min-h-svh place-items-center px-6 text-center">
      <div>
        <p className="display text-flare" style={{ fontSize: "8rem" }} aria-hidden>11</p>
        <h1 className="display text-4xl">You&apos;re offline</h1>
        <p className="mx-auto mt-4 max-w-md text-dim">Event details you&apos;ve already opened are saved on this device. Here&apos;s the essentials:</p>
        <p className="mt-6 font-bold">{longDate(event.date)}</p>
        <p className="text-dim">{event.venue.name}, {event.venue.city}</p>
        <a className="btn btn-primary mt-8" href="/">Try again</a>
      </div>
    </main>
  );
}

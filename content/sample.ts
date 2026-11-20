import type { EventContent } from "./types";

/**
 * PLACEHOLDER DEMO CONTENT: invented purely to preview the layout. NOT real event details.
 * Only used when NEXT_PUBLIC_SHOW_SAMPLE_CONTENT=1. Delete this file once the real agenda is in content/event.ts.
 */
export const sample: Partial<EventContent> = {
  schedule: [
    { time: "08:30", title: "Registration & breakfast", description: "Check in, collect your badge and settle in over breakfast.", location: "Foyer" },
    { time: "09:30", title: "Welcome & opening", description: "Kick-off for the day.", highlight: true, location: "Main hall" },
    { time: "10:15", title: "Keynote", description: "Sample keynote session.", speaker: "Speaker name", location: "Main hall" },
    { time: "11:15", title: "Tea break", description: "Refreshments and networking." },
    { time: "11:45", title: "Panel discussion", description: "Sample panel session.", speaker: "Panelists TBA", location: "Main hall" },
    { time: "13:00", title: "Lunch", description: "Buffet lunch.", location: "Restaurant" },
    { time: "14:30", title: "Breakout sessions", description: "Choose a track.", location: "Rooms A / B / C" },
    { time: "16:30", title: "Anniversary celebration", description: "The 11-year moment.", highlight: true, location: "Main hall" },
    { time: "18:00", title: "Evening entertainment", description: "Sample entertainment slot." },
    { time: "19:30", title: "Dinner & close", description: "Dinner and goodbyes." },
  ],
  info: [
    { label: "Dress code", value: "Smart casual (sample)" },
    { label: "Arrival & registration", value: "Registration opens at 08:30 at the main foyer (sample)" },
    { label: "Important instructions", value: "Carry a photo ID and your invitation (sample)" },
  ],
  faqs: [
    { q: "Can I bring a guest? (sample)", a: "Sample answer. Replace with the real policy." },
    { q: "Is parking available? (sample)", a: "Sample answer. Replace with confirmed parking details." },
  ],
  contact: { name: "Event team (sample)", email: "events@example.com", phone: null },
};

import type { EventContent } from "./types";

/**
 * SINGLE SOURCE OF TRUTH for event content. Edit this file only; no animation code needs to change.
 * Nothing unconfirmed has been invented: `null` / empty arrays are deliberate placeholders.
 */
export const event: EventContent = {
  title: "11 Years of Impact",
  shortTitle: "Impact 11",
  organization: "Impact Analytics",
  years: 11,
  tagline: "An evening to celebrate eleven years of Impact Analytics.",

  date: "2026-12-17",
  startTime: null, // TODO(organizer): e.g. "18:00" once confirmed. Until then the countdown is date-based.
  timezone: "Asia/Kolkata",

  venue: {
    name: "Hilton Embassy Tech Village",
    city: "Bengaluru",
    country: "India",
    address: null, // TODO(organizer): confirmed street address
    mapsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent("Hilton Embassy Tech Village, Bengaluru, India"),
    arrival: null,
    parking: null,
    transport: null,
    photo: null,
  },

  celebration: {
    eyebrow: "The celebration",
    statement:
      "Eleven years of building, learning and showing up together. One evening to celebrate the people behind every one of them.",
    body: [
      "Editable copy. Replace this paragraph in content/event.ts with the anniversary story.",
    ],
  },

  // Agenda is intentionally empty until sessions are confirmed. Example shape:
  // { time: "18:00", title: "Doors open", description: "…", highlight: true }
  schedule: [],

  info: [
    { label: "Dress code", value: null },
    { label: "Arrival & registration", value: null },
    { label: "Important instructions", value: null },
  ],

  faqs: [],

  contact: { name: null, email: null, phone: null },

  announcementLinks: [],
};

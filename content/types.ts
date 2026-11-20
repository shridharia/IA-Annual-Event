/** Every field that is `null` / empty is an UNCONFIRMED detail: hidden in production, shown as a placeholder in dev. */
export type ScheduleItem = {
  /** 24h "HH:mm" in the event timezone, e.g. "18:30". Omit if unconfirmed. */
  time: string | null;
  title: string;
  description?: string;
  speaker?: string;
  location?: string;
  /** Highlights the item as a key moment. */
  highlight?: boolean;
};

export type Faq = { q: string; a: string };

export type InfoField = {
  label: string;
  /** null = not yet confirmed */
  value: string | null;
};

export type EventContent = {
  title: string;
  shortTitle: string;
  organization: string;
  years: number;
  tagline: string;
  /** ISO date in the event timezone, e.g. "2026-12-17" */
  date: string;
  /** "HH:mm" in the event timezone. null = not announced → date-based countdown only. */
  startTime: string | null;
  timezone: "Asia/Kolkata";
  venue: {
    name: string;
    city: string;
    country: string;
    /** Confirmed street address. null until provided. */
    address: string | null;
    /** Validated Google Maps directions link (name-based, no invented address). */
    mapsUrl: string;
    arrival: string | null;
    parking: string | null;
    transport: string | null;
    /** Local licensed photo in /public, e.g. "/venue/hall.jpg". */
    photo: string | null;
  };
  celebration: { eyebrow: string; statement: string; body: string[] };
  schedule: ScheduleItem[];
  info: InfoField[];
  faqs: Faq[];
  contact: { name: string | null; email: string | null; phone: string | null };
  announcementLinks: { label: string; href: string }[];
};

export const EVENT_TZ = "Asia/Kolkata";
/** Asia/Kolkata is UTC+05:30 year-round (no DST), so a fixed offset is exact. */
export const IST_OFFSET = "+05:30";

/** Interpret a wall-clock date ("YYYY-MM-DD") + time ("HH:mm") in IST and return the UTC instant. */
export function istToDate(date: string, time = "00:00"): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const d = new Date(`${date}T${time}:00${IST_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatIST(iso: string | Date, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: EVENT_TZ,
    dateStyle: "medium",
    timeStyle: "short",
    ...opts,
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

export type Remaining = { done: boolean; days: number; hours: number; minutes: number; seconds: number };

export function remaining(target: Date, now: number): Remaining {
  const diff = Math.max(0, target.getTime() - now);
  return {
    done: diff === 0,
    days: Math.floor(diff / 864e5),
    hours: Math.floor(diff / 36e5) % 24,
    minutes: Math.floor(diff / 6e4) % 60,
    seconds: Math.floor(diff / 1e3) % 60,
  };
}

/** "Thursday, 17 December 2026" rendered in IST regardless of the viewer's zone. */
export function longDate(isoDate: string) {
  const d = istToDate(isoDate)!;
  return new Intl.DateTimeFormat("en-GB", { timeZone: EVENT_TZ, dateStyle: "full" }).format(d);
}

/** "18:30" -> "6:30 PM" */
export function formatClock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

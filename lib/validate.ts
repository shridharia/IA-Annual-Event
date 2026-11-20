import { z } from "zod";

export const CATEGORIES = ["announcement", "schedule", "arrival", "venue", "reminder", "urgent"] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * Deep links may only point inside this site: "/" or "/path#hash" (no "//", no scheme).
 * This prevents organizers (or a compromised account) from using notifications for phishing redirects.
 */
export function isSafeDeepLink(v: string): boolean {
  return /^\/(?![/\\])[^\s]*$/.test(v) && v.length <= 500;
}

/**
 * Push endpoints must belong to a real push service. The server POSTs to whatever endpoint is stored, so accepting
 * arbitrary https URLs would let anyone make our server call internal or third-party addresses (SSRF).
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/,
  /^([a-z0-9-]+\.)*push\.services\.mozilla\.com$/,
  /^([a-z0-9-]+\.)*push\.apple\.com$/,
  /^([a-z0-9-]+\.)*notify\.windows\.com$/,
];
export function isPushServiceEndpoint(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && PUSH_HOSTS.some((r) => r.test(u.hostname));
  } catch {
    return false;
  }
}

export function isHttpsUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && v.length <= 1000;
  } catch {
    return false;
  }
}

const optionalString = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());

export const notificationInput = z.object({
  title: z.string().trim().min(1).max(65),
  body: z.string().trim().min(1).max(178),
  url: optionalString(500).refine((v) => v === undefined || isSafeDeepLink(v), "Deep link must be a path on this site, like /#schedule"),
  image: optionalString(1000).refine((v) => v === undefined || isHttpsUrl(v), "Image must be an https URL"),
  category: z.enum(CATEGORIES),
  mode: z.enum(["now", "schedule"]),
  /** IST wall-clock, required when mode === "schedule" */
  date: optionalString(10),
  time: optionalString(5),
  idempotencyKey: z.string().uuid(),
});
export type NotificationInput = z.infer<typeof notificationInput>;

export const notificationEdit = notificationInput.omit({ mode: true, idempotencyKey: true }).extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export const subscriptionInput = z.object({
  endpoint: z.string().url().max(2000).refine(isPushServiceEndpoint, "endpoint must be a known push service"),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
  categories: z.array(z.enum(CATEGORIES)).max(6).optional(),
});

export const unsubscribeInput = z.object({
  endpoint: z.string().url().max(2000),
  auth: z.string().min(8).max(100),
});

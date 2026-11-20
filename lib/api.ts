import "server-only";
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { getOrganizer, type Organizer } from "@/lib/auth";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error: message, ...extra }, { status });

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Returns true when the request is within the limit. Fails OPEN on DB errors so a limiter outage can't take the site down. */
export async function allow(key: string, windowSeconds: number, max: number) {
  const { data, error } = await admin().rpc("rate_limit_hit", { p_key: key, p_window_seconds: windowSeconds, p_max: max });
  if (error) return true;
  return data === true;
}

/** Same-origin check for cookie-authenticated mutations (CSRF defence in depth on top of SameSite cookies). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(req.url).origin;
}

export async function withOrganizer(req: Request, fn: (o: Organizer) => Promise<Response>): Promise<Response> {
  if (req.method !== "GET" && !sameOrigin(req)) return fail("Bad origin", 403);
  const { organizer } = await getOrganizer();
  if (!organizer) return fail("Unauthorized", 401);
  return fn(organizer);
}

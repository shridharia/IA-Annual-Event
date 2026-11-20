import { timingSafeEqual } from "node:crypto";
import { claimAndDispatch } from "@/lib/push/dispatch";
import { fail, json } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false; // refuse to run unprotected
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Scheduler tick. Claims due jobs atomically in Postgres (FOR UPDATE SKIP LOCKED) then sends them.
 * Safe to call concurrently or more often than needed: a job can only be claimed once per attempt.
 * Delivery time is "at or shortly after" scheduled_for (cron granularity + push-service latency); never before.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return fail("Unauthorized", 401);
  try {
    const results = await claimAndDispatch({ limit: 5 });
    return json({ processed: results.length, results });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
export const POST = GET;

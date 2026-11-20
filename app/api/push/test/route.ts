import { randomUUID } from "node:crypto";
import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { allow, clientIp, fail, json } from "@/lib/api";
import { subscriptionInput } from "@/lib/validate";

export const runtime = "nodejs";

/** TESTING ONLY. Disabled unless ENABLE_TEST_TOOLS=1. Remove the variable before the event. */
const enabled = () => process.env.ENABLE_TEST_TOOLS === "1";
const DELAY_MS = 5 * 60_000;

/** Lets the test panel discover whether testing is on, and fetch the (public) VAPID key. */
export async function GET() {
  return json({ enabled: enabled(), vapidPublicKey: enabled() ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null : null });
}

/**
 * Schedules ONE push to the caller's own device, 5 minutes from now, through the normal pipeline:
 * a `notifications` row addressed to the device, picked up by the scheduler (so it proves the real
 * closed-app path). Test devices are flagged `test_only` and excluded from every real broadcast.
 */
export async function POST(req: Request) {
  if (!enabled()) return fail("Test tools are disabled", 404);
  const ip = clientIp(req);
  if (!(await allow(`test:${ip}`, 3600, 10))) return fail("Too many tests from this network. Try again later.", 429);

  const body = z.object({ subscription: subscriptionInput }).safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("Invalid subscription");
  const { endpoint, keys } = body.data.subscription;
  const db = admin();

  // Reuse the device if it already exists (never downgrade a real subscriber to test_only).
  const { data: existing } = await db.from("push_subscriptions").select("id").eq("endpoint", endpoint).maybeSingle();
  let subId = existing?.id as string | undefined;
  if (subId) {
    await db.from("push_subscriptions").update({ p256dh: keys.p256dh, auth: keys.auth, status: "active", expired_at: null, last_seen_at: new Date().toISOString() }).eq("id", subId);
  } else {
    const { data, error } = await db.from("push_subscriptions")
      .insert({ endpoint, p256dh: keys.p256dh, auth: keys.auth, test_only: true, user_agent: (req.headers.get("user-agent") ?? "").slice(0, 160) })
      .select("id").single();
    if (error) return fail("Could not register this device", 500);
    subId = data.id;
  }

  // One pending test per device: return it instead of stacking up duplicates.
  const { data: pending } = await db.from("notifications").select("id,scheduled_for")
    .eq("target_subscription_id", subId).eq("status", "pending").limit(1).maybeSingle();
  if (pending) return json({ ok: true, scheduledFor: pending.scheduled_for, existing: true });

  const scheduledFor = new Date(Date.now() + DELAY_MS).toISOString();
  const { error } = await db.from("notifications").insert({
    idempotency_key: randomUUID(), title: "Test reminder: 5 minutes", body: "This arrived after your 5-minute test, even with the app closed.",
    url: "/", category: "reminder", mode: "schedule", scheduled_for: scheduledFor, target_subscription_id: subId,
  });
  if (error) return fail("Could not schedule the test", 500);
  return json({ ok: true, scheduledFor, existing: false });
}

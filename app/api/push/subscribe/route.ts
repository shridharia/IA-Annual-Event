import { admin } from "@/lib/supabase/admin";
import { allow, clientIp, fail, json } from "@/lib/api";
import { subscriptionInput } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await allow(`sub:${clientIp(req)}`, 60, 20))) return fail("Too many requests", 429);
  const parsed = subscriptionInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid subscription");
  const { endpoint, keys, categories } = parsed.data;
  // Upsert on endpoint = dedupe. Re-subscribing re-activates a previously expired/unsubscribed device.
  const { error } = await admin().from("push_subscriptions").upsert(
    {
      endpoint, p256dh: keys.p256dh, auth: keys.auth,
      ...(categories ? { categories } : {}),
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 160),
      status: "active", last_seen_at: new Date().toISOString(), expired_at: null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return fail("Could not save subscription", 500);
  return json({ ok: true });
}

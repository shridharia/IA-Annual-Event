import { admin } from "@/lib/supabase/admin";
import { allow, clientIp, fail, json } from "@/lib/api";
import { unsubscribeInput } from "@/lib/validate";

export const runtime = "nodejs";

/**
 * Secure unsubscribe: the caller must prove possession of the subscription secret (`auth` key) in addition to
 * the endpoint, so third parties can't unsubscribe someone else's device by guessing/knowing an endpoint URL.
 */
export async function POST(req: Request) {
  if (!(await allow(`unsub:${clientIp(req)}`, 60, 20))) return fail("Too many requests", 429);
  const parsed = unsubscribeInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");
  await admin()
    .from("push_subscriptions")
    .update({ status: "unsubscribed" })
    .eq("endpoint", parsed.data.endpoint)
    .eq("auth", parsed.data.auth);
  return json({ ok: true }); // idempotent; never reveals whether a record existed
}

import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { fail, json, withOrganizer } from "@/lib/api";
import { logActivity } from "@/lib/auth";
import { sendPush } from "@/lib/push/server";

export const runtime = "nodejs";

/** Sends a one-off test to a single subscribed device (the organizer's own). Not recorded as a broadcast. */
export async function POST(req: Request) {
  return withOrganizer(req, async (o) => {
    const p = z.object({ endpoint: z.string().url() }).safeParse(await req.json().catch(() => null));
    if (!p.success) return fail("Invalid request");
    const { data: sub } = await admin().from("push_subscriptions").select("id,endpoint,p256dh,auth")
      .eq("endpoint", p.data.endpoint).eq("status", "active").maybeSingle();
    if (!sub) return fail("This device isn't subscribed. Enable notifications on it first.", 404);
    const r = await sendPush(sub, {
      id: "00000000-0000-4000-8000-000000000000", title: "Test notification ✓",
      body: "Push is working on this device.", url: "/", category: "reminder",
    });
    if (!r.ok && r.gone) await admin().from("push_subscriptions").update({ status: "expired", expired_at: new Date().toISOString() }).eq("id", sub.id);
    await logActivity(o, "test_push", { ok: r.ok });
    return r.ok ? json({ ok: true, status: r.status }) : fail(`Push service rejected the request (${r.status ?? "network"}): ${r.error}`, 502);
  });
}

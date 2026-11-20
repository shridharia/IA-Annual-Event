import { admin } from "@/lib/supabase/admin";
import { allow, fail, json, withOrganizer } from "@/lib/api";
import { logActivity } from "@/lib/auth";
import { claimAndDispatch } from "@/lib/push/dispatch";
import { istToDate } from "@/lib/time";
import { notificationInput } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  return withOrganizer(req, async () => {
    const scope = new URL(req.url).searchParams.get("scope");
    let q = admin().from("notifications").select("*").limit(100);
    q = scope === "upcoming"
      ? q.in("status", ["pending", "processing"]).order("scheduled_for", { ascending: true })
      : q.order("created_at", { ascending: false });
    const { data, error } = await q;
    if (error) return fail(error.message, 500);
    return json({ notifications: data });
  });
}

export async function POST(req: Request) {
  return withOrganizer(req, async (o) => {
    if (!(await allow(`send:${o.id}`, 60, 10))) return fail("Slow down — too many sends", 429);
    const parsed = notificationInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    const v = parsed.data;

    const row: Record<string, unknown> = {
      idempotency_key: v.idempotencyKey, title: v.title, body: v.body, url: v.url ?? null,
      image_url: v.image ?? null, category: v.category, mode: v.mode, created_by: o.id,
    };
    if (v.mode === "schedule") {
      const when = v.date && v.time ? istToDate(v.date, v.time) : null;
      if (!when) return fail("Pick a valid date and time (IST)", 422);
      if (when.getTime() < Date.now() + 60_000) return fail("Scheduled time must be at least a minute in the future", 422);
      if (when.getTime() > Date.now() + 366 * 864e5) return fail("Scheduled time is too far ahead", 422);
      row.scheduled_for = when.toISOString();
    } // "now": scheduled_for defaults to the database clock, so the claim check can never be ahead of it.

    const { data, error } = await admin().from("notifications").insert(row).select("*").single();
    if (error) {
      if (error.code === "23505") {
        // Duplicate-send protection: same idempotency key → return the original, do not dispatch again.
        const { data: existing } = await admin().from("notifications").select("*").eq("idempotency_key", v.idempotencyKey).single();
        return json({ duplicate: true, notification: existing });
      }
      return fail(error.message, 500);
    }
    await logActivity(o, v.mode === "now" ? "send_now" : "schedule", { id: data.id, title: v.title, category: v.category });

    if (v.mode === "now") {
      await claimAndDispatch({ id: data.id, limit: 1 });
      const { data: fresh } = await admin().from("notifications").select("*").eq("id", data.id).single();
      return json({ notification: fresh }, 201);
    }
    return json({ notification: data }, 201);
  });
}

import { admin } from "@/lib/supabase/admin";
import { fail, json, withOrganizer } from "@/lib/api";
import { logActivity } from "@/lib/auth";
import { istToDate } from "@/lib/time";
import { notificationEdit } from "@/lib/validate";
import { z } from "zod";

export const runtime = "nodejs";

/** Edit a PENDING, unclaimed notification. The status guard is in the UPDATE itself, so it is race-safe against the scheduler. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withOrganizer(req, async (o) => {
    const { id } = await ctx.params;
    if (!z.string().uuid().safeParse(id).success) return fail("Invalid id", 400);
    const parsed = notificationEdit.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    const v = parsed.data;
    const when = istToDate(v.date, v.time);
    if (!when || when.getTime() < Date.now() + 60_000) return fail("Scheduled time must be at least a minute in the future", 422);
    const { data, error } = await admin().from("notifications").update({
      title: v.title, body: v.body, url: v.url ?? null, image_url: v.image ?? null, category: v.category,
      scheduled_for: when.toISOString(), next_attempt_at: null, updated_at: new Date().toISOString(),
    }).eq("id", id).eq("status", "pending").eq("mode", "schedule").select("*");
    if (error) return fail(error.message, 500);
    if (!data?.length) return fail("Only pending scheduled notifications can be edited", 409);
    await logActivity(o, "edit", { id });
    return json({ notification: data[0] });
  });
}

import { admin } from "@/lib/supabase/admin";
import { fail, json, withOrganizer } from "@/lib/api";
import { logActivity } from "@/lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withOrganizer(req, async (o) => {
    const { id } = await ctx.params;
    if (!z.string().uuid().safeParse(id).success) return fail("Invalid id", 400);
    // Atomic: only a still-pending job flips to cancelled; a job already claimed by the scheduler cannot be cancelled.
    const { data, error } = await admin().from("notifications")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id).eq("status", "pending").select("id");
    if (error) return fail(error.message, 500);
    if (!data?.length) return fail("Too late: this notification is already sending or finished", 409);
    await logActivity(o, "cancel", { id });
    return json({ ok: true });
  });
}

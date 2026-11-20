import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";

export type Organizer = { id: string; email: string; role: string };

/**
 * Server-side authorization. Two checks, both required:
 *  1. getUser() validates the JWT with Supabase Auth (not just decoding the cookie).
 *  2. The user must exist in public.organizers (role verification), so merely having a Supabase
 *     account (e.g. via open signups) grants nothing.
 */
export async function getOrganizer(): Promise<{ organizer: Organizer | null; signedIn: boolean }> {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return { organizer: null, signedIn: false };
  const { data: row } = await admin().from("organizers").select("role").eq("user_id", user.id).maybeSingle();
  if (!row) return { organizer: null, signedIn: true };
  return { organizer: { id: user.id, email: user.email ?? "", role: row.role }, signedIn: true };
}

export async function logActivity(o: Organizer, action: string, details: Record<string, unknown> = {}) {
  await admin().from("admin_activity").insert({ actor: o.id, actor_email: o.email, action, details });
}

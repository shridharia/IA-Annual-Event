import { z } from "zod";
import { admin } from "@/lib/supabase/admin";
import { allow, clientIp, fail, json } from "@/lib/api";

export const runtime = "nodejs";

/** Best-effort open signal from the service worker. Unauthenticated by nature → rate-limited, low-trust metric. */
export async function POST(req: Request) {
  if (!(await allow(`open:${clientIp(req)}`, 60, 30))) return fail("Too many requests", 429);
  const p = z.object({ id: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Invalid");
  await admin().from("notification_opens").insert({ notification_id: p.data.id });
  return json({ ok: true });
}

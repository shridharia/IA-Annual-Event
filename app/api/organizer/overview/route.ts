import { admin } from "@/lib/supabase/admin";
import { json, withOrganizer } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req: Request) {
  return withOrganizer(req, async () => {
    const db = admin();
    const count = async (t: string, f?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let q = db.from(t).select("*", { count: "exact", head: true });
      if (f) q = f(q);
      return (await q).count ?? 0;
    };
    const [active, expired, unsub, sentN, pendingN, failedN, partialN, accepted, delFailed, delTotal, opens] = await Promise.all([
      count("push_subscriptions", (q) => q.eq("status", "active").eq("test_only", false)),
      count("push_subscriptions", (q) => q.eq("status", "expired")),
      count("push_subscriptions", (q) => q.eq("status", "unsubscribed")),
      count("notifications", (q) => q.eq("status", "sent")),
      count("notifications", (q) => q.eq("status", "pending")),
      count("notifications", (q) => q.eq("status", "failed")),
      count("notifications", (q) => q.eq("status", "partially_failed")),
      count("notification_deliveries", (q) => q.eq("status", "accepted")),
      count("notification_deliveries", (q) => q.eq("status", "failed")),
      count("notification_deliveries"),
      count("notification_opens"),
    ]);
    const [{ data: recent }, { data: upcoming }, { data: activity }] = await Promise.all([
      db.from("notifications").select("*").not("status", "in", "(pending,processing,cancelled)").order("created_at", { ascending: false }).limit(5),
      db.from("notifications").select("*").eq("status", "pending").order("scheduled_for").limit(5),
      db.from("admin_activity").select("*").order("created_at", { ascending: false }).limit(8),
    ]);
    return json({
      subscriptions: { active, expired, unsubscribed: unsub },
      notifications: { sent: sentN, pending: pendingN, failed: failedN, partiallyFailed: partialN },
      deliveries: { attempted: delTotal, acceptedByPushService: accepted, failed: delFailed, reportedOpens: opens },
      recent, upcoming, activity,
    });
  });
}

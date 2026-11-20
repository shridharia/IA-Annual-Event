import "server-only";
import { admin } from "@/lib/supabase/admin";
import { sendPush, type PushPayload } from "./server";
import { isRetryable, resolveStatus } from "./backoff";

export type NotificationRow = {
  id: string; title: string; body: string; url: string | null; image_url: string | null;
  category: string; claim_token: string; attempt_count: number; target_subscription_id?: string | null;
};

const CONCURRENCY = 20;
/** Leave headroom under the serverless function limit (route sets maxDuration = 60). */
const TIME_BUDGET_MS = 45_000;

/**
 * Sends one CLAIMED notification. Idempotent: each (notification, subscription) pair has a single
 * delivery row, and subscriptions already 'accepted' are never contacted again — so retries and
 * crash-recovery re-runs cannot double-send to the same device.
 */
export async function dispatchNotification(n: NotificationRow) {
  const db = admin();
  const started = Date.now();

  let q = db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("status", "active");
  if (n.target_subscription_id) {
    q = q.eq("id", n.target_subscription_id); // testing-only: a single device
  } else {
    q = q.eq("test_only", false); // test devices never receive real broadcasts
    if (n.category !== "urgent") q = q.contains("categories", [n.category]); // urgent reaches everyone
  }
  const { data: subs, error } = await q;
  if (error) return finish(n, { status: "pending", retryInMs: 60_000, error: error.message, refund: false });

  // Ensure a delivery row per target (ignore existing → preserves accepted state).
  if (subs?.length) {
    await db.from("notification_deliveries").upsert(
      subs.map((s) => ({ notification_id: n.id, subscription_id: s.id })),
      { onConflict: "notification_id,subscription_id", ignoreDuplicates: true },
    );
  }
  const { data: rows } = await db
    .from("notification_deliveries").select("subscription_id,status").eq("notification_id", n.id);
  const done = new Set((rows ?? []).filter((r) => r.status === "accepted").map((r) => r.subscription_id));
  const todo = (subs ?? []).filter((s) => !done.has(s.id));

  const payload: PushPayload = {
    id: n.id, title: n.title, body: n.body, url: n.url ?? "/", image: n.image_url, category: n.category,
  };

  let timedOut = false;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    if (Date.now() - started > TIME_BUDGET_MS) { timedOut = true; break; }
    const chunk = todo.slice(i, i + CONCURRENCY);
    const results = await Promise.all(chunk.map((s) => sendPush(s, payload)));
    const now = new Date().toISOString();
    const expiredIds: string[] = [];
    const updates = chunk.map((s, idx) => {
      const r = results[idx];
      const status = r.ok ? "accepted" : r.gone ? "expired" : "failed";
      if (!r.ok && r.gone) expiredIds.push(s.id);
      return {
        notification_id: n.id, subscription_id: s.id, status,
        http_status: r.status ?? null, error: r.ok ? null : r.error, last_attempt_at: now, attempts: n.attempt_count,
      };
    });
    await db.from("notification_deliveries").upsert(updates, { onConflict: "notification_id,subscription_id" });
    if (expiredIds.length) {
      // Safely retire dead endpoints (404/410 from the push service).
      await db.from("push_subscriptions").update({ status: "expired", expired_at: now }).in("id", expiredIds);
    }
  }

  await db.rpc("refresh_notification_counts", { p_id: n.id });
  const { data: all } = await db
    .from("notification_deliveries").select("subscription_id,status,http_status").eq("notification_id", n.id);
  // Only consider devices that are still active subscribers (unsubscribed/expired ones can no longer be retried).
  const activeIds = new Set((subs ?? []).map((s) => s.id));
  const list = (all ?? []).filter((d) => activeIds.has(d.subscription_id) || d.status === "accepted");
  const accepted = list.filter((d) => d.status === "accepted").length;
  const failed = list.filter((d) => d.status === "failed");
  const retryable = failed.filter((d) => isRetryable(d.http_status ?? undefined)).length;
  const permanent = failed.length - retryable;
  const expired = list.filter((d) => d.status === "expired").length;

  if (timedOut) {
    // Ran out of time budget: continue shortly without consuming a retry attempt.
    return finish(n, { status: "pending", retryInMs: 15_000, refund: true, target: list.length });
  }
  const verdict = resolveStatus(
    { accepted, failedRetryable: retryable, failedPermanent: permanent, expired }, n.attempt_count, accepted,
  );
  // Nobody to send to (no subscribers) is a legitimate "sent" with 0 targets.
  return finish(n, { ...verdict, refund: false, target: list.length, error: failed[0] ? "see deliveries" : undefined });
}

async function finish(
  n: NotificationRow,
  v: { status: "pending" | "sent" | "partially_failed" | "failed"; retryInMs: number; error?: string; refund: boolean; target?: number },
) {
  const terminal = v.status !== "pending";
  const patch: Record<string, unknown> = {
    status: v.status,
    updated_at: new Date().toISOString(),
    last_error: v.error ?? null,
    claim_token: null,
    claimed_at: null,
    completed_at: terminal ? new Date().toISOString() : null,
    next_attempt_at: v.status === "pending" ? new Date(Date.now() + v.retryInMs).toISOString() : null,
  };
  if (v.target !== undefined) patch.target_count = v.target;
  if (v.refund) patch.attempt_count = Math.max(0, n.attempt_count - 1);
  // Only the current claim holder may write the outcome (guards against a stale worker overwriting a re-claim).
  await admin().from("notifications").update(patch).eq("id", n.id).eq("claim_token", n.claim_token);
  return { id: n.id, status: v.status };
}

export async function claimAndDispatch(opts: { id?: string; limit?: number }) {
  const { data, error } = await admin().rpc("claim_due_notifications", {
    p_limit: opts.limit ?? 5, p_id: opts.id ?? null,
  });
  if (error) throw new Error(error.message);
  const out = [];
  for (const row of (data ?? []) as NotificationRow[]) out.push(await dispatchNotification(row));
  return out;
}

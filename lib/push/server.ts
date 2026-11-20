import "server-only";
import * as webpush from "web-push";
import { serverEnv } from "@/lib/env";
import { isGone, isRetryable } from "./backoff";

let configured = false;
function setup() {
  if (!configured) {
    webpush.setVapidDetails(serverEnv.vapidSubject, serverEnv.vapidPublic, serverEnv.vapidPrivate);
    configured = true;
  }
}

export type PushPayload = {
  id: string;
  title: string;
  body: string;
  url: string;
  image?: string | null;
  category: string;
};

export type SendResult =
  | { ok: true; status: number }
  | { ok: false; status?: number; gone: boolean; retryable: boolean; error: string };

export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<SendResult> {
  setup();
  try {
    const res = await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: payload.category === "urgent" ? "high" : "normal", timeout: 10_000 },
    );
    return { ok: true, status: res.statusCode };
  } catch (e) {
    const err = e as { statusCode?: number; body?: string; message?: string };
    return {
      ok: false,
      status: err.statusCode,
      gone: isGone(err.statusCode),
      retryable: isRetryable(err.statusCode),
      error: (err.body || err.message || "send failed").toString().slice(0, 300),
    };
  }
}

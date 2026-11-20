export type Notif = {
  id: string; title: string; body: string; url: string | null; image_url: string | null; category: string;
  mode: "now" | "schedule"; status: "pending" | "processing" | "sent" | "partially_failed" | "failed" | "cancelled";
  scheduled_for: string; next_attempt_at: string | null; attempt_count: number; completed_at: string | null;
  target_count: number; accepted_count: number; failed_count: number; expired_count: number; last_error: string | null; created_at: string;
};
export type Overview = {
  subscriptions: { active: number; expired: number; unsubscribed: number };
  notifications: { sent: number; pending: number; failed: number; partiallyFailed: number };
  deliveries: { attempted: number; acceptedByPushService: number; failed: number; reportedOpens: number };
  recent: Notif[]; upcoming: Notif[];
  activity: { id: number; actor_email: string | null; action: string; created_at: string; details: Record<string, unknown> }[];
};
export type Draft = {
  id?: string; title: string; body: string; url: string; image: string; category: string;
  mode: "now" | "schedule"; date: string; time: string; key: string;
};

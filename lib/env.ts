/** Lazy env access with explicit errors; server-only values are never referenced from client code. */
function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable ${name}. See .env.example`);
  return v;
}
export const publicEnv = {
  get siteUrl() { return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"; },
};
export const serverEnv = {
  get supabaseUrl() { return need("NEXT_PUBLIC_SUPABASE_URL"); },
  get serviceRoleKey() { return need("SUPABASE_SERVICE_ROLE_KEY"); },
  get vapidPublic() { return need("NEXT_PUBLIC_VAPID_PUBLIC_KEY"); },
  get vapidPrivate() { return need("VAPID_PRIVATE_KEY"); },
  get vapidSubject() { return need("VAPID_SUBJECT"); },
  get cronSecret() { return need("CRON_SECRET"); },
};

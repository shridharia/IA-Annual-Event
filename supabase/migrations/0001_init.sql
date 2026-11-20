-- 11 Years of Impact — schema. All timestamps are timestamptz (stored UTC).
-- Security model: RLS is ON for every table with NO policies for anon/authenticated.
-- Only the server (service_role key, never shipped to the browser) reads/writes data,
-- and every organizer API verifies the caller against public.organizers first.

create extension if not exists pgcrypto;

-- ───────────────────────── organizers (role verification) ─────────────────────────
create table public.organizers (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'organizer' check (role in ('organizer','admin')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── push subscriptions ─────────────────────────
create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  endpoint      text not null unique,            -- dedupe key
  p256dh        text not null,
  auth          text not null,
  categories    text[] not null default '{announcement,schedule,arrival,venue,reminder,urgent}',
  user_agent    text,                            -- coarse, truncated; only for debugging
  status        text not null default 'active' check (status in ('active','expired','unsubscribed')),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  expired_at    timestamptz
);
create index on public.push_subscriptions (status);

-- ───────────────────────── notifications (jobs) ─────────────────────────
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,          -- duplicate-send protection
  title           text not null,
  body            text not null,
  url             text,
  image_url       text,
  category        text not null check (category in ('announcement','schedule','arrival','venue','reminder','urgent')),
  mode            text not null check (mode in ('now','schedule')),
  status          text not null default 'pending'
                  check (status in ('pending','processing','sent','partially_failed','failed','cancelled')),
  scheduled_for   timestamptz not null default now(),   -- UTC; never sent before this
  next_attempt_at timestamptz,                          -- set on retry (backoff)
  attempt_count   int not null default 0,
  claimed_at      timestamptz,
  claim_token     uuid,
  started_at      timestamptz,
  completed_at    timestamptz,
  target_count    int not null default 0,
  accepted_count  int not null default 0,        -- accepted by the push service (NOT "delivered to a screen")
  failed_count    int not null default 0,
  expired_count   int not null default 0,
  last_error      text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.notifications (status, scheduled_for);

create table public.notification_deliveries (
  id              uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status          text not null default 'pending' check (status in ('pending','accepted','failed','expired')),
  http_status     int,
  error           text,
  attempts        int not null default 0,
  last_attempt_at timestamptz,
  unique (notification_id, subscription_id)       -- idempotent: one row (and one accepted send) per pair
);

-- Best-effort "opened" pings from the service worker's notificationclick handler.
create table public.notification_opens (
  id              bigint generated always as identity primary key,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create table public.admin_activity (
  id         bigint generated always as identity primary key,
  actor      uuid references auth.users(id) on delete set null,
  actor_email text,
  action     text not null,
  details    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         int not null default 0,
  primary key (key, window_start)
);

-- ───────────────────────── RLS: deny everything to client roles ─────────────────────────
alter table public.organizers              enable row level security;
alter table public.push_subscriptions      enable row level security;
alter table public.notifications           enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_opens      enable row level security;
alter table public.admin_activity          enable row level security;
alter table public.rate_limits             enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ───────────────────────── functions (service_role only) ─────────────────────────
-- Atomic claim: FOR UPDATE SKIP LOCKED means two concurrent workers can never claim the same job.
-- Also recovers jobs stuck in 'processing' for > 5 minutes (crashed worker).
create or replace function public.claim_due_notifications(p_limit int default 5, p_id uuid default null)
returns setof public.notifications
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select n.id from public.notifications n
    where (p_id is null or n.id = p_id)
      and ( (n.status = 'pending' and coalesce(n.next_attempt_at, n.scheduled_for) <= now()
             and n.scheduled_for <= now())
         or (n.status = 'processing' and n.claimed_at < now() - interval '5 minutes') )
    order by n.scheduled_for
    limit p_limit
    for update skip locked
  )
  update public.notifications n
     set status = 'processing', claimed_at = now(), claim_token = gen_random_uuid(),
         attempt_count = n.attempt_count + 1, started_at = coalesce(n.started_at, now()), updated_at = now()
    from due where n.id = due.id
  returning n.*;
end $$;

create or replace function public.refresh_notification_counts(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.notifications n set
    accepted_count = (select count(*) from public.notification_deliveries d where d.notification_id = p_id and d.status = 'accepted'),
    failed_count   = (select count(*) from public.notification_deliveries d where d.notification_id = p_id and d.status = 'failed'),
    expired_count  = (select count(*) from public.notification_deliveries d where d.notification_id = p_id and d.status = 'expired'),
    updated_at = now()
  where n.id = p_id;
$$;

-- Fixed-window rate limiter that works across serverless instances. Returns true if allowed.
create or replace function public.rate_limit_hit(p_key text, p_window_seconds int, p_max int)
returns boolean language plpgsql security definer set search_path = public as $$
declare w timestamptz; h int;
begin
  w := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits(key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into h;
  delete from public.rate_limits where window_start < now() - interval '1 day' and random() < 0.01;
  return h <= p_max;
end $$;

revoke all on function public.claim_due_notifications(int, uuid) from public, anon, authenticated;
revoke all on function public.refresh_notification_counts(uuid)  from public, anon, authenticated;
revoke all on function public.rate_limit_hit(text, int, int)     from public, anon, authenticated;
grant execute on function public.claim_due_notifications(int, uuid) to service_role;
grant execute on function public.refresh_notification_counts(uuid)  to service_role;
grant execute on function public.rate_limit_hit(text, int, int)     to service_role;
grant all on all tables in schema public to service_role;

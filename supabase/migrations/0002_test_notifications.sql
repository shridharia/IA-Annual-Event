-- Testing-only support: one-off notifications addressed to a single device, and test devices that are
-- excluded from real broadcasts. Safe to leave in production; nothing uses it unless ENABLE_TEST_TOOLS=1.
alter table public.push_subscriptions add column if not exists test_only boolean not null default false;
alter table public.notifications add column if not exists target_subscription_id uuid
  references public.push_subscriptions(id) on delete cascade;
create index if not exists notifications_target_idx on public.notifications (target_subscription_id)
  where target_subscription_id is not null;

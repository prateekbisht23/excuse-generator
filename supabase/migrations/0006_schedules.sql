-- Scheduled excuses: once, daily, weekdays or weekly, in the user's own time zone.
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references public.targets (id) on delete cascade,
  reason text not null check (reason in ('wfh', 'leave', 'late')),
  kind text not null check (kind in ('once', 'daily', 'weekdays', 'weekly')),
  local_time text not null check (local_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  local_date date,                              -- once only
  weekdays int[] not null default '{}',         -- weekly only, 0 = Sunday .. 6 = Saturday
  timezone text not null,
  active boolean not null default true,
  next_run_at timestamptz,                      -- null once a one-time schedule has run
  claimed_until timestamptz,                    -- lease so two ticks never take the same row
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists schedules_due_idx on public.schedules (next_run_at) where active and next_run_at is not null;
create index if not exists schedules_user_idx on public.schedules (user_id);

alter table public.schedules enable row level security;
create policy "schedules_own" on public.schedules
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Log which schedule run produced a message; the unique index makes a double log impossible.
alter table public.excuse_log
  add column if not exists schedule_id uuid references public.schedules (id) on delete set null,
  add column if not exists scheduled_for timestamptz;
create unique index if not exists excuse_log_schedule_run_idx
  on public.excuse_log (schedule_id, scheduled_for) where schedule_id is not null;
alter table public.excuse_log drop constraint if exists excuse_log_status_check;
alter table public.excuse_log add constraint excuse_log_status_check check (status in ('sent', 'failed', 'skipped'));

-- Atomically take due schedules for the scheduler. Only the server's secret key may call it.
create or replace function public.claim_due_schedules(batch int default 25)
returns setof public.schedules
language sql
security definer
set search_path = ''
as $$
  update public.schedules s
     set claimed_until = now() + interval '3 minutes'
   where s.id in (
     select id from public.schedules
      where active and next_run_at is not null and next_run_at <= now()
        and (claimed_until is null or claimed_until < now())
      order by next_run_at
      limit batch
      for update skip locked
   )
  returning s.*;
$$;
revoke all on function public.claim_due_schedules(int) from public, anon, authenticated;
grant execute on function public.claim_due_schedules(int) to service_role;

-- Every excuse that is sent (or fails to send). Target label is copied so history survives target deletion.
create table if not exists public.excuse_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid references public.targets (id) on delete set null,
  target_label text not null,
  reason text not null,
  text text not null,
  source text not null check (source in ('ai', 'bank', 'manual')),
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists excuse_log_user_time_idx on public.excuse_log (user_id, created_at desc);

alter table public.excuse_log enable row level security;
create policy "excuse_log_select_own" on public.excuse_log
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "excuse_log_insert_own" on public.excuse_log
  for insert to authenticated with check ((select auth.uid()) = user_id);

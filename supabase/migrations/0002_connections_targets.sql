-- A connection is one authorised account at a provider (e.g. a Slack user token).
-- Tokens are encrypted by the app (AES-256-GCM) before they are stored.
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('slack', 'gmail')),
  external_account text not null,          -- e.g. Slack "TEAMID:USERID"
  label text,                              -- e.g. workspace name
  encrypted_tokens text not null,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, provider, external_account)
);

-- A target is where an excuse is sent (a channel, a DM, an email address) plus its template.
create table if not exists public.targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_id uuid not null references public.connections (id) on delete cascade,
  kind text not null check (kind in ('channel', 'dm', 'email')),
  external_id text not null,
  label text not null,
  template text not null default 'I''ll be working from home today. {excuse}',
  created_at timestamptz not null default now(),
  unique (connection_id, external_id)
);

alter table public.connections enable row level security;
alter table public.targets enable row level security;

create policy "connections_own" on public.connections
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "targets_own" on public.targets
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists targets_user_idx on public.targets (user_id);
create index if not exists connections_user_idx on public.connections (user_id);

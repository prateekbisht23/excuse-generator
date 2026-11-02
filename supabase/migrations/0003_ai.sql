-- Learned writing style per target, optional bring-your-own AI key, and a usage log for rate limiting.
alter table public.targets
  add column if not exists persona jsonb,
  add column if not exists persona_updated_at timestamptz;

create table if not exists public.ai_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('gemini', 'anthropic', 'openai')),
  encrypted_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_time_idx on public.ai_usage (user_id, created_at desc);

alter table public.ai_keys enable row level security;
alter table public.ai_usage enable row level security;

create policy "ai_keys_own" on public.ai_keys
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "ai_usage_insert_own" on public.ai_usage
  for insert to authenticated with check ((select auth.uid()) = user_id);

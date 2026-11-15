# Excuse Generator

Random, persona-aware excuses for your leave/WFH updates. Sign in with Google, connect Slack and Gmail, then quick-send or schedule.

See [docs/PLAN.md](docs/PLAN.md) for the full plan. Status: M1–M7 shipped, live at https://excuses.bishh.dev.

Scheduling runs on Supabase `pg_cron` (`supabase/migrations/0007_cron_tick.sql`) calling `/api/cron/tick` every minute. A daily Vercel cron hits `/api/keepalive` so the free Supabase project never pauses.

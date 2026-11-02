# Excuse Generator: plan

## Context
Our office has a leave-updates Slack channel. Whenever someone posts "WFH" or "on leave", the manager wants a random, funny excuse to go with it. This is a personal fun project (GitHub, hosted on a custom domain). It is a website where a user signs in with Google, connects Slack (and email), sets a message template per destination, then quick-sends or schedules a message with an AI-generated excuse. Every send is recorded in a history log. This is a greenfield project and does not use the OneXO delivery workflow.

## Step 0: repo first, no code yet (user request)
Before any code is written:
1. Create the GitHub repo `excuse-generator` under `github.com/prateekbisht23`. The repo is private by default, and I'll ask if you'd rather make it public.
2. Clone it to `~/Desktop/excuse-generator`.
3. First commit contains only `docs/PLAN.md` (this detailed plan, copied into the repo so it travels with the project), a `README.md` stub and a `.gitignore`. Coding starts only after you've read the plan.

**Browser skill:** I don't see a browser skill in my available skills, so I can't drive github.com in a browser. Options:
- (a) I use the `gh` CLI (`gh repo create prateekbisht23/excuse-generator --private --clone`), if it's installed and logged in. I'll check with `gh auth status`.
- (b) You make the empty repo on github.com yourself and I clone it.
- (c) You point me to the browser skill or tool you mean and I use that.
I'll try (a) first and tell you if it isn't set up. I won't create anything until plan mode is off and you've approved.

## Detailed plan (copied into `docs/PLAN.md`)
### Milestones and acceptance checks
| # | Milestone | Done when |
|---|---|---|
| M1 | Scaffold and auth | `pnpm dev` runs, Google sign-in works locally, `profiles` row is created on first login, RLS blocks cross-user reads |
| M2 | Slack connect | OAuth round trip stores an encrypted token, channel and DM picker lists targets, `chat.postMessage` as the user works in a test channel |
| M3 | Excuse engine | Static bank returns an excuse instantly, Gemini generates one in the user's persona, and the fallback kicks in when the key is missing or fails |
| M4 | Quick send and history | One click sends and writes `excuse_log`, `/history` lists, filters and shows failures with the error |
| M5 | Scheduling | One-time and repeating schedules fire within a minute of `next_run_at`, are never sent twice, and respect timezone and DST |
| M6 | Gmail | `gmail.send` sends to a configured address with the same template flow |
| M7 | Deploy | `excuses.bishh.dev` is live with TLS, prod OAuth redirects work, and the e2e smoke test passes |

### Repo layout
`app/` (routes, UI), `lib/connectors/`, `lib/excuses/`, `lib/ai/`, `lib/crypto.ts`, `lib/schedule.ts`, `supabase/migrations/`, `docs/`, `tests/`.

### Excuse generation detail
- Inputs: `reason` (WFH, leave, late, sick), `template` (e.g. "I'll be working from home today. {excuse}"), `persona_json` (tone, length, emoji use, typical phrases), `recent_excuses` (last 20 from `excuse_log`, to avoid repeats).
- Prompt asks for one short, funny, harmless excuse in the persona's voice; output is validated for length and filtered against a small blocklist (no health, family-tragedy or discrimination jokes).
- Cache the persona and refresh it weekly or on demand.

### Risks and mitigations
- Slack workspace admin must approve the app, so check this on day one.
- Gemini free tier rate limits are handled with per-user limits, caching and the static fallback.
- Gmail `gmail.send` is a sensitive scope, so stay in Testing mode with listed test users.
- Duplicate sends are prevented with row locking (`SKIP LOCKED`) and an idempotency key on `excuse_log`.
- Excuses to a manager can backfire, so every first send to a new target requires a preview and confirm.

## Decisions (from the user)
- Stack: Next.js (App Router, TypeScript) + Supabase (Postgres, with Auth for Google login). Tailwind + shadcn/ui.
- Login: Google only (via Supabase Auth).
- Slack: connect with a **user token**, so messages post as the person.
- MVP includes: login, Slack, Gmail, quick send, scheduling (one-time and repeat), history.
- AI: the server's free **Gemini** key is the default (no setup for users). Optional bring-your-own-key (BYOK) for Gemini, Anthropic or OpenAI keys, stored encrypted.
- Domain: `bishh.dev`. The user wrote both `bishh.dev` and `bash.app`, so I'll **confirm `bishh.dev`** and use the subdomain `excuses.bishh.dev` (changeable).

## Architecture
- Next.js app on Vercel (Hobby). Supabase supplies the DB, Auth and scheduling.
- **Scheduler:** Vercel Hobby cron runs at most once a day, which is too coarse. Use Supabase `pg_cron` + `pg_net` to call `POST /api/cron/tick` every minute with a shared secret header. The tick selects due `schedules` (`next_run_at <= now()`) using `FOR UPDATE SKIP LOCKED`, sends each one, writes history and advances `next_run_at`. Repeats are stored as RRULE or cron plus timezone.
- **Connector interface** (`lib/connectors/types.ts`): `connect()`, `listTargets()`, `send(target, text)`, `fetchPastMessages(target, userId)`. Implementations: `slack.ts` and `gmail.ts`, with more added later.
- **Excuse engine** (`lib/excuses/`):
  - Persona builder: pulls the user's own past messages from the target (Slack history filtered to their user id), then the LLM summarises a style and persona.
  - Generator: takes the template, the reason (WFH or leave) and the persona, and returns a fresh excuse. Falls back to a curated static bank if the LLM fails or there is no history.
- **AI provider abstraction** (`lib/ai/`): `gemini` (server key), `anthropic`, `openai`. User keys are encrypted with AES-GCM using an env master key.
- **Connecting a subscription (ChatGPT Plus, Claude Pro) is not feasible.** Those subscriptions do not provide API access to third-party apps, and trying to reuse them breaks the terms of service. We offer free server Gemini plus BYOK, with a rate limit per user.

## Data model (Supabase, RLS on every table by `user_id`)
- `profiles(id, display_name, timezone)`
- `connections(id, user_id, provider, external_account, encrypted_tokens, scopes)`
- `targets(id, connection_id, kind[channel|dm|email], external_id, label, template, persona_json, tone)`
- `schedules(id, target_id, reason, rrule/cron, timezone, next_run_at, active)`
- `excuse_log(id, user_id, target_id, schedule_id null, reason, text, status[sent|failed|scheduled], error, sent_at)`
- `ai_keys(id, user_id, provider, encrypted_key)`

## Pages and APIs
- `/login`, `/onboarding` (connect tools, pick target, set template), `/dashboard` (quick-send card: reason, target, "generate", preview, send), `/schedules`, `/history`, `/settings` (AI keys, connections).
- Routes: `/api/connect/slack/{start,callback}`, `/api/connect/gmail/*`, `/api/excuses/generate`, `/api/send`, `/api/schedules`, `/api/cron/tick`.

## Connectors
- **MVP:** Slack (user scopes `chat:write`, `channels:read`, `groups:read`, `im:write`, `users:read`, `channels:history`, `groups:history`) and Gmail (`gmail.send` only). Reading the sent mailbox needs a restricted scope, so email personas come from manual samples.
- **Phase 2, in order of ease:** Discord webhook, Microsoft Teams (incoming webhook or Graph), generic webhook, Telegram bot. Skip WhatsApp (paid and awkward).

## Prerequisites checklist (accounts, keys and config you need)
1. **GitHub:** a new private or public repo `excuse-generator`.
2. **Supabase:** a project, with Google provider enabled, `pg_cron` and `pg_net` extensions turned on, and the project URL, anon key and service-role key.
3. **Google Cloud:** a project with an OAuth consent screen and a Web client ID and secret. Redirect URI is the Supabase callback. Add the `gmail.send` scope; keep the app in "Testing" with your colleagues as test users (this avoids the verification process, which is limited to 100 users).
4. **Slack app** (api.slack.com/apps): user token scopes as above, redirect URL `https://excuses.bishh.dev/api/connect/slack/callback`. Needs a client id, secret and signing secret. Installing to the workspace may need admin approval; check this early.
5. **Gemini API key** from Google AI Studio (free tier has rate limits, so we add a per-user limit and cache).
6. **Vercel:** an account connected to the GitHub repo. Hobby is fine for a personal, non-commercial project.
7. **DNS:** a CNAME for `excuses` on `bishh.dev` pointing to Vercel, and add the domain in Vercel (TLS is automatic).
8. **Secrets/env:** `TOKEN_ENCRYPTION_KEY` (32 bytes), `CRON_SECRET`, `GEMINI_API_KEY`, the Slack and Google credentials, and the Supabase keys. These go in Vercel env vars and a local `.env.local` that is not committed.
9. **Local tooling:** Node 20+ or Bun, the Supabase CLI (for migrations), and `ngrok` or `cloudflared` for testing the Slack OAuth callback locally.

## Build order
1. Scaffold Next.js, Tailwind and shadcn; Supabase migrations with RLS; Google login.
2. Slack OAuth connect, target picker and encrypted token storage.
3. Excuse engine: static bank plus Gemini; persona builder from Slack history; BYOK settings.
4. Quick send plus `excuse_log`; History page.
5. Schedules: UI, next-run computation, `/api/cron/tick`, `pg_cron` job.
6. Gmail connector.
7. Deploy: Vercel, domain, production OAuth redirects, smoke test.
8. (Later) Discord, Teams and webhook connectors.

## Security notes
- Tokens and API keys are encrypted at rest and never sent to the client.
- Rate-limit generation and sending per user.
- Verify the cron secret.
- Add a dry-run/preview step before the first send to a channel.
- Persona learning reads Slack history, so show clear consent copy and let users delete the stored persona.

## Verification
- Unit tests: scheduler next-run (repeat and timezone edge cases), encryption round trip, connector interface mocks, and engine fallback when the LLM fails.
- Manual e2e locally: sign in with Google, connect Slack to a private test channel, quick-send, and confirm the message appears and the history row is written.
- Schedule a one-minute-ahead send and confirm the tick fires it once (no double-send) and that a repeat advances `next_run_at`.
- Deploy to the preview URL, then repeat the e2e check on `excuses.bishh.dev`.

## Out of scope for the first version
Apple and GitHub login, team and manager admin views, WhatsApp, billing, reading the user's sent email, and connecting to paid chat subscriptions.

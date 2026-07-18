# Real Estate TeamOS

Multi-tenant SaaS for small UAE real estate agencies. Agents log outreach and
leads; managers get live dashboards — without WhatsApp daily reporting.

See [PROJECT_BRIEF.md](./PROJECT_BRIEF.md), [MODULE_ROADMAP.md](./MODULE_ROADMAP.md),
and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Stack

- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + RLS)
- Vercel + Resend (email)

## Phase 0 status

Scaffolding is complete:

- App + shadcn/ui
- Supabase browser/server/middleware clients
- Spine migration: `supabase/migrations/0001_init.sql`
- Extensible folders: `lib/services`, `lib/integrations/*`, `lib/auth`
- Architecture rules: `docs/ARCHITECTURE.md`

## Setup

1. **Node** — prefer Node 22+ (20.19+ minimum recommended).
2. Copy env file:

   ```bash
   cp .env.example .env.local
   ```

3. Create a project at [supabase.com](https://supabase.com), paste URL + anon key into `.env.local`.
4. Run the spine schema in the Supabase SQL editor (or CLI):

   ```bash
   # paste contents of supabase/migrations/0001_init.sql
   ```

5. Install & run:

   ```bash
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Security defaults

- Every tenant table has `agency_id`; RLS is required in the same migration.
- Never use the service role key from Client Components or public routes.
- Business logic lives in `/src/lib/services` — routes stay thin.
- Role checks use `hasRole()` in `/src/lib/auth/roles.ts`.

## Next module

Phase 4 AI is complete. Next: **Phase 5 — Expansion** (portals / localization / billing when demanded).

## Phase 4 (done)

- Lead scoring → `ai_insights` (`lead_score`); UI at `/a/[slug]/ai`
- Agents slipping weekly alert + manager email (`agent_slipping`)
- Flag: `ai_insights` on Team page
- Crons: `/api/cron/ai-lead-scores` (daily), `/api/cron/ai-agents-slipping` (Mon)
- Migration: `0005_ai_insights.sql`

## Phase 3 (done)

- Webhook: `POST /api/webhooks/whatsapp` (+ Meta GET verify)
- Shared insert: `insertOutreachEvent` / dashboard `logOutreach`
- Feature flag: `whatsapp_module` on Team page
- Migration: `0004_whatsapp_phone.sql`

## Phase 2 (done)

- Daily digest cron: `GET /api/cron/daily-digest` + `vercel.json` (02:00 UTC)
- Insights: `/a/[slug]/insights` (trends + source conversion)
- PWA: `manifest.ts`, icons, installable metadata

## Module 8 (done)

- Follow-ups on agent dashboard: due today + overdue
- Complete clears `follow_up_date` + logs `followup_completed`
- Set dates on lead create/edit (already in Module 4)
- Service: `lib/services/followups.ts`

## Module 7 (done)

- `/a/[slug]/reports` — daily/weekly agency + per-agent summary
- **Export CSV** — browser download only (no server storage)
- Service: `lib/services/reports.ts`

## Module 6 (done)

- `/a/[slug]/leaderboard` — week/month + rank by messages/leads/closings
- Sourced only from `activity_events`
- Service: `lib/services/leaderboard.ts`

## Module 5 (done)

- `/a/[slug]/manager` — managers/owners only
- Live activity feed from `activity_events`
- Per-agent today/week outreach + leads + closed won
- Charts: daily team outreach + per-agent bars (recharts)
- Service: `lib/services/manager.ts`

## Module 4 (done)

- `/a/[slug]/leads` — list
- `/a/[slug]/leads/new` — create
- `/a/[slug]/leads/[id]` — edit (status/source/notes/follow-up)
- Activity events: `lead_created`, `lead_status_changed`
- Service: `lib/services/leads.ts`

## Module 3 (done)

- `/a/[slug]/dashboard` — agent daily dashboard
- Outreach logger → `activity_events` (`outreach_logged`)
- Today totals by channel (Dubai calendar day)
- Service: `lib/services/activity.ts` (`logOutreach` reusable by WhatsApp later)

## Module 2 (done)

- `/onboarding` — create agency (owner via `create_agency` RPC)
- `/a/[slug]/team` — invite teammates (manager+)
- `/a/[slug]/join?token=` — accept invite + set password
- Resend email when `RESEND_API_KEY` is set; otherwise shareable invite link
- Migration: `supabase/migrations/0003_agency_onboarding_invites.sql`

## Module 1 (done)

- `/login`, `/signup`, `/magic-link`
- `/auth/callback` for email links
- `/account` (session + agency list)
- `/a/[slug]` gated by `requireMembership()` + RLS
- Services: `lib/services/auth.ts`, `lib/services/membership.ts`
- Migration: `supabase/migrations/0002_membership_read_policies.sql`

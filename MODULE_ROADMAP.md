# Module Roadmap

Work top to bottom. Finish one module at a time, referencing this file,
PROJECT_BRIEF.md, and docs/ARCHITECTURE.md. Don't start a module until the
previous one is working end-to-end (migrated, tested manually, committed).

## Phase 0 — Project setup
- [x] `npx create-next-app@latest` (TypeScript, Tailwind, App Router)
- [x] Install shadcn/ui, init
- [x] Wire `@supabase/supabase-js` + `@supabase/ssr` clients (create your
      Supabase project and paste keys into `.env.local`)
- [x] Add `docs/ARCHITECTURE.md`, `PROJECT_BRIEF.md`, this file to repo root
- [x] Set up `/supabase/migrations/0001_init.sql` with the spine tables
- [x] Git init, first commit

## Phase 1 — Spine + MVP (weeks 1–6)
Build in this exact order — each depends on the previous:

1. **Auth + multi-tenancy + roles** ✅
   - Scope: Implement Supabase auth (email/password + magic link)
     for TeamOS. Set up the agencies/users/agency_members tables per
     PROJECT_BRIEF.md and docs/ARCHITECTURE.md. Add RLS so users only see
     rows for their own agency_id. Add a hasRole() helper in lib/auth/roles.ts.

2. **Agency onboarding + invites** ✅
   - "Build agency signup flow: create agency (name, slug), owner account,
     invite teammates by email via Resend. Invited users land on
     /a/[slug]/join to set a password and get added to agency_members
     with role='agent' by default."

3. **Outreach logger (agent dashboard)** ✅
   - "Build the agent daily dashboard at /a/[slug]/dashboard. Include an
     outreach logger form (channel: facebook/instagram/linkedin/whatsapp/
     email/calls, count, notes) that writes to activity_events with
     event_type='outreach_logged'. Show today's totals by channel."

4. **Lead management** ✅
   - "Build leads CRUD at /a/[slug]/leads: create/edit/list/status/source.
     Lead status changes should also write to activity_events
     (event_type='lead_status_changed') so they show up in reports later."

5. **Manager dashboard** ✅
   - "Build /a/[slug]/manager (manager/owner only, use hasRole()) showing
     team overview: live activity feed pulled from activity_events,
     per-agent today/week totals, simple performance charts (recharts via
     shadcn)."

6. **Leaderboard** ✅
   - "Build /a/[slug]/leaderboard ranking agents by messages sent, leads
     created, and deals closed this week/month, sourced entirely from
     activity_events — no new tables."

7. **Reports + CSV export** ✅
   - "Build /a/[slug]/reports: daily/weekly summary per agent and per
     agency, with a CSV export button (client-side, no server storage
     needed for MVP)."

8. **Follow-ups & tasks** ✅
   - "Build follow-up/task management: agents can set a follow-up date
     on a lead, see a 'due today/overdue' list on their dashboard.
     Completing one logs event_type='followup_completed'."

Ship Phase 1 to 2-3 pilot agencies before starting Phase 2.

## Phase 2 — Retention (months 2–4)
1. **Daily manager digest** ✅
   - Cron `/api/cron/daily-digest` (Bearer `CRON_SECRET`) emails yesterday’s
     summary to managers/owners via Resend. Uses service-role admin client.
2. **Trends & conversion** ✅
   - `/a/[slug]/insights` — 14-day trends + conversion rate by lead source
     (managers+).
3. **Mobile polish / PWA** ✅
   - Web app manifest, theme color, apple web app meta, responsive `min-h-dvh`.

## Phase 3 — WhatsApp module (months 3–5)
1. **WhatsApp inbound logging** ✅
   - Webhook `POST /api/webhooks/whatsapp` (Twilio form or Meta JSON)
   - Parses `5 whatsapp` / `log 3 calls` → shared `insertOutreachEvent`
     (`source: whatsapp`) — same spine as the dashboard form
   - Gated by `feature_flags.whatsapp_module` per agency
   - Agent link via `agency_members.whatsapp_phone` (migration 0004)
   - Team UI: enable flag + set phones

## Phase 4 — AI module (months 4–6+)
1. **Lead scoring** ✅
   - Heuristic `scoreLead` → `ai_insights` (`insight_type=lead_score`)
   - Cron `GET /api/cron/ai-lead-scores` + manual refresh on `/a/[slug]/ai`
2. **Agents slipping** ✅
   - Weekly cron `GET /api/cron/ai-agents-slipping` (Mon 03:00 UTC)
   - Compares outreach week-over-week; emails managers; stores `agent_slipping`
3. **Feature flag** ✅
   - Gated by `feature_flags.ai_insights` (Team page toggle)
   - Migration: `0005_ai_insights.sql`

## Phase 5 — Expansion
- [ ] Property Finder / Bayut integration (only if demanded by real users)
- [ ] Saudi/Qatar localization (currency, Arabic RTL, compliance)
- [ ] Usage-based billing / Stripe, upgrade off free tiers

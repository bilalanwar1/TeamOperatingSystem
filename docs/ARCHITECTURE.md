# Real Estate TeamOS — Architecture Rules

## What this project is

Multi-tenant SaaS for small UAE real estate agencies (3–25 agents) to replace
manual WhatsApp daily reporting. Agents log outreach, leads, follow-ups.
Managers see real-time dashboards, leaderboards, reports. See PROJECT_BRIEF.md
for full product context — read it before starting any new module.

## Tech stack (do not deviate without asking)

- Next.js 15 (App Router), TypeScript strict mode
- Tailwind CSS + shadcn/ui components only (no other UI kit)
- Supabase: Postgres + Auth + Storage, Row Level Security everywhere
- Hosting: Vercel free tier — keep functions lightweight, avoid long-running jobs
- Email: Resend

## Non-negotiable architecture rules

1. **Multi-tenancy**: every tenant-scoped table MUST have an `agency_id`
   column referencing `agencies.id`. Every query MUST go through RLS —
   never bypass with the service role key from client-reachable code.

2. **The activity log is generic, not feature-specific**. All agent actions
   (outreach logged, lead created, follow-up completed, future WhatsApp
   message, future AI suggestion) write to the single `activity_events`
   table (agency_id, agent_id, event_type text, payload jsonb, created_at).
   Do NOT create a new dedicated table per activity type. Dashboards,
   leaderboards, and reports query this table — new event_types must not
   require dashboard code changes.

3. **Service layer, not fat routes**. Business logic lives in
   `/lib/services/*.ts`. API routes (`/app/api/**/route.ts`) and Server
   Actions call service functions — they contain no business logic
   themselves. This is required so future WhatsApp webhooks and AI cron
   jobs can call the exact same functions the dashboard uses.

4. **Feature flags per agency** via the `feature_flags` table
   (agency_id, flag_key, enabled). Any module still in pilot (AI insights,
   WhatsApp bot, portal sync) must be gated behind a flag check in the
   service layer, not commented-out code or env vars.

5. **Roles**: super_admin > agency_owner > manager > agent. Role checks
   happen in the service layer (never trust client-side role checks).
   Use a `hasRole()` helper in `/lib/auth/roles.ts`, don't inline checks.

6. **File/folder conventions**:
   - `/app/(dashboard)/a/[agencySlug]/...` — path-based tenant routing
   - `/lib/services/` — business logic
   - `/lib/supabase/` — client + server Supabase instances only
   - `/components/` — shadcn/ui-based components, no inline styles
   - `/supabase/migrations/` — every schema change is a numbered SQL migration file, never edit the DB by hand

7. **Every new table needs an RLS policy in the same migration file that
   creates it.** Never ship a table without RLS enabled.

## When building a new module

1. State which phase/module this is (see MODULE_ROADMAP.md).
2. If it needs a new table, write the migration first, including RLS.
3. Write the service function(s) before the UI.
4. Write the API route / Server Action as a thin wrapper over the service.
5. Then build the UI with shadcn components.
6. Do not touch other modules' files unless explicitly asked.

## What NOT to do

- Don't introduce a new state management library (React state + Server
  Components/Actions is enough for this app's scale).
- Don't add a new ORM — use the Supabase JS client directly.
- Don't build native mobile — web-responsive only until told otherwise.
- Don't add portal integrations (Property Finder/Bayut) or WhatsApp
  unless the current task explicitly says so — these are later phases.

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

2. **Agency onboarding + invites**
   - "Build agency signup flow: create agency (name, slug), owner account,
     invite teammates by email via Resend. Invited users land on
     /a/[slug]/join to set a password and get added to agency_members
     with role='agent' by default."

3. **Outreach logger (agent dashboard)**
   - "Build the agent daily dashboard at /a/[slug]/dashboard. Include an
     outreach logger form (channel: facebook/instagram/linkedin/whatsapp/
     email/calls, count, notes) that writes to activity_events with
     event_type='outreach_logged'. Show today's totals by channel."

4. **Lead management**
   - "Build leads CRUD at /a/[slug]/leads: create/edit/list/status/source.
     Lead status changes should also write to activity_events
     (event_type='lead_status_changed') so they show up in reports later."

5. **Manager dashboard**
   - "Build /a/[slug]/manager (manager/owner only, use hasRole()) showing
     team overview: live activity feed pulled from activity_events,
     per-agent today/week totals, simple performance charts (recharts via
     shadcn)."

6. **Leaderboard**
   - "Build /a/[slug]/leaderboard ranking agents by messages sent, leads
     created, and deals closed this week/month, sourced entirely from
     activity_events — no new tables."

7. **Reports + CSV export**
   - "Build /a/[slug]/reports: daily/weekly summary per agent and per
     agency, with a CSV export button (client-side, no server storage
     needed for MVP)."

8. **Follow-ups & tasks**
   - "Build follow-up/task management: agents can set a follow-up date
     on a lead, see a 'due today/overdue' list on their dashboard.
     Completing one logs event_type='followup_completed'."

Ship Phase 1 to 2-3 pilot agencies before starting Phase 2.

## Phase 2 — Retention (months 2–4)
- [ ] Email notifications (daily digest to managers via Resend)
- [ ] Trend charts / conversion rate by lead source
- [ ] Mobile-responsive polish / installable PWA

## Phase 3 — WhatsApp module (months 3–5)
- [ ] Webhook receiver (WhatsApp Business API or Twilio) that parses
      inbound agent messages and calls the SAME outreach-logging service
      function the dashboard form calls — writes to activity_events with
      event_type='outreach_logged', source='whatsapp'. No dashboard changes.
- [ ] Gate behind feature_flags per agency during pilot.

## Phase 4 — AI module (months 4–6+)
- [ ] Lead scoring service reading leads + activity_events, writing to a
      new ai_insights table (agency_id, lead_id, insight_type, payload)
- [ ] "Agents slipping" manager alert (weekly job comparing activity trend)
- [ ] Gate behind feature_flags, pilot with 1 agency first.

## Phase 5 — Expansion
- [ ] Property Finder / Bayut integration (only if demanded by real users)
- [ ] Saudi/Qatar localization (currency, Arabic RTL, compliance)
- [ ] Usage-based billing / Stripe, upgrade off free tiers

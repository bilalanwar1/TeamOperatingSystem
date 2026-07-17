# Real Estate TeamOS — Product Brief

## Problem
Agency managers waste 1+ hour every evening asking agents "how many messages
did you send today?" over WhatsApp. No tracking, no analytics, leads get lost.

## Solution
One dashboard where agents log daily outreach (Facebook, Instagram, LinkedIn,
WhatsApp, Email, Calls), save leads, and track follow-ups. Managers see
real-time team performance, leaderboards, and reports — no WhatsApp needed.

## Target market
UAE real estate agencies, 3–25 agents, initially Dubai. Expand to Saudi,
Qatar, USA later. Competing against PropSpace (UAE-native, ~AED 176/user/mo,
full CRM) and generic CRMs (Zoho, Bitrix24, Salesforce) that are too heavy
for small agencies. The real incumbent is "WhatsApp group + Excel."
Wedge: lightweight, activity-first, cheap, fast to onboard — not "CRM #47."

## User roles
super_admin → agency_owner → manager → agent

## MVP feature list (build in this order — see MODULE_ROADMAP.md)
1. Auth (email/password + magic link)
2. Agency onboarding + team invites
3. Agent dashboard: today's stats, outreach logger, follow-ups, tasks
4. Lead management (CRUD, status tracking, source tracking)
5. Manager dashboard: team overview, live activity, performance charts
6. Team leaderboard (rank by messages, leads, closings)
7. Reports (daily/weekly, CSV export)
8. Follow-up & task management

## Deliberately out of scope for MVP
- Portal integrations (Property Finder, Bayut, Dubizzle)
- RERA document generation (Form A/B/F/I), Ejari
- WhatsApp bot / native automation
- AI features
- Native mobile app
- Commission tracking

These are all real future modules (see MODULE_ROADMAP.md) — the schema and
service-layer pattern in this repo are deliberately built so they can be
added without breaking existing modules. Don't build ahead of the current
phase unless asked.

## Multi-tenancy model
Path-based routing: `teamos.app/a/{agency-slug}`. Every tenant table has an
`agency_id`; Postgres RLS enforces isolation. No cross-agency data should
ever be reachable, even by bugs in application code — RLS is the real
boundary, not app logic.

## Business model
Free while pre-revenue (Vercel + Supabase free tiers). Upgrade to paid tiers
only once there are paying customers. Target: land 2-3 pilot agencies free,
convert to paid, then scale outreach in Dubai broker market (~9,785
registered brokerage offices, majority under 25 agents).

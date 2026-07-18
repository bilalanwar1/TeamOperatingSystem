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

**Phase 1 / Module 2 — Agency onboarding + invites**

## Module 1 (done)

- `/login`, `/signup`, `/magic-link`
- `/auth/callback` for email links
- `/account` (session + agency list)
- `/a/[slug]` gated by `requireMembership()` + RLS
- Services: `lib/services/auth.ts`, `lib/services/membership.ts`
- Migration: `supabase/migrations/0002_membership_read_policies.sql`

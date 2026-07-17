-- ============================================================
-- Real Estate TeamOS — Phase 1 spine schema
-- Run in Supabase SQL editor, or via `supabase migration up`
-- ============================================================

-- ---------- AGENCIES ----------
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- AGENCY MEMBERS (users + roles, linked to auth.users) ----------
create type agency_role as enum ('super_admin', 'agency_owner', 'manager', 'agent');

create table agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role agency_role not null default 'agent',
  full_name text,
  email text not null,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (agency_id, user_id)
);

-- ---------- LEADS ----------
create type lead_status as enum ('new', 'contacted', 'qualified', 'negotiating', 'closed_won', 'closed_lost');
create type lead_source as enum ('facebook', 'instagram', 'linkedin', 'whatsapp', 'email', 'calls', 'referral', 'portal', 'other');

create table leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  agent_id uuid not null references agency_members(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  status lead_status not null default 'new',
  source lead_source not null default 'other',
  notes text,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ACTIVITY EVENTS (the generic spine table) ----------
-- Every agent action — outreach logged, lead status changed, follow-up
-- completed, and FUTURE event types (whatsapp-sourced, ai-generated) —
-- writes here. Dashboards/leaderboards/reports query this table only.
create table activity_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  agent_id uuid not null references agency_members(id) on delete cascade,
  event_type text not null, -- e.g. 'outreach_logged', 'lead_status_changed', 'followup_completed'
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_events_agency_created on activity_events (agency_id, created_at desc);
create index idx_activity_events_agent_created on activity_events (agent_id, created_at desc);
create index idx_activity_events_type on activity_events (event_type);

-- ---------- FEATURE FLAGS (per agency, for gated rollout of new modules) ----------
create table feature_flags (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  flag_key text not null, -- e.g. 'whatsapp_module', 'ai_insights'
  enabled boolean not null default false,
  unique (agency_id, flag_key)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table agencies enable row level security;
alter table agency_members enable row level security;
alter table leads enable row level security;
alter table activity_events enable row level security;
alter table feature_flags enable row level security;

-- Helper: is the current user a member of this agency?
create or replace function is_agency_member(target_agency_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from agency_members
    where agency_id = target_agency_id
      and user_id = auth.uid()
      and joined_at is not null
  );
$$;

-- Helper: does the current user have manager/owner/admin role in this agency?
create or replace function is_agency_manager(target_agency_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from agency_members
    where agency_id = target_agency_id
      and user_id = auth.uid()
      and role in ('manager', 'agency_owner', 'super_admin')
      and joined_at is not null
  );
$$;

-- agencies: members can read their own agency
create policy "agencies: members can read"
  on agencies for select
  using (is_agency_member(id));

-- agency_members: members can read all members of their own agency
create policy "agency_members: members can read own agency roster"
  on agency_members for select
  using (is_agency_member(agency_id));

-- agency_members: only managers+ can insert/update roster (invites, role changes)
create policy "agency_members: managers can manage roster"
  on agency_members for all
  using (is_agency_manager(agency_id))
  with check (is_agency_manager(agency_id));

-- leads: agents can CRUD their own leads; managers can CRUD all agency leads
create policy "leads: agents manage own leads"
  on leads for all
  using (
    agent_id in (select id from agency_members where user_id = auth.uid())
    or is_agency_manager(agency_id)
  )
  with check (
    agent_id in (select id from agency_members where user_id = auth.uid())
    or is_agency_manager(agency_id)
  );

-- activity_events: agents can insert/read their own events; managers read all
create policy "activity_events: agents insert own events"
  on activity_events for insert
  with check (
    agent_id in (select id from agency_members where user_id = auth.uid())
  );

create policy "activity_events: read own or manager reads agency"
  on activity_events for select
  using (
    agent_id in (select id from agency_members where user_id = auth.uid())
    or is_agency_manager(agency_id)
  );

-- feature_flags: managers+ only
create policy "feature_flags: managers manage"
  on feature_flags for all
  using (is_agency_manager(agency_id))
  with check (is_agency_manager(agency_id));

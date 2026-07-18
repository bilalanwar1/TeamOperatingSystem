-- ============================================================
-- Phase 4: AI insights (lead scoring, agent slipping alerts)
-- ============================================================

create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  agent_id uuid references agency_members(id) on delete set null,
  insight_type text not null, -- 'lead_score' | 'agent_slipping'
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_ai_insights_agency_created
  on ai_insights (agency_id, created_at desc);

create index idx_ai_insights_lead
  on ai_insights (lead_id, created_at desc)
  where lead_id is not null;

create index idx_ai_insights_type
  on ai_insights (agency_id, insight_type, created_at desc);

alter table ai_insights enable row level security;

-- Agency members can read insights for their agency
create policy "ai_insights: members can read"
  on ai_insights
  for select
  using (is_agency_member(agency_id));

-- Managers can insert/update/delete (manual refresh); cron uses service role
create policy "ai_insights: managers manage"
  on ai_insights
  for all
  using (is_agency_manager(agency_id))
  with check (is_agency_manager(agency_id));

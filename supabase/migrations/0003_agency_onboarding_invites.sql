-- ============================================================
-- Module 2: agency onboarding + invites
-- ============================================================

-- ---------- INVITES ----------
create table agency_invites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agencies(id) on delete cascade,
  email text not null,
  role agency_role not null default 'agent',
  token text not null unique,
  invited_by uuid not null references agency_members(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (agency_id, email)
);

create index idx_agency_invites_token on agency_invites (token);
create index idx_agency_invites_agency on agency_invites (agency_id, created_at desc);

alter table agency_invites enable row level security;

-- Managers+ can manage invites for their agency
create policy "agency_invites: managers manage"
  on agency_invites
  for all
  using (is_agency_manager(agency_id))
  with check (is_agency_manager(agency_id));

-- ---------- CREATE AGENCY (bootstrap owner — SECURITY DEFINER) ----------
create or replace function public.create_agency(p_name text, p_slug text)
returns public.agencies
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_full_name text;
  v_agency public.agencies;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Agency name must be at least 2 characters';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Slug must be lowercase letters, numbers, and hyphens';
  end if;

  if length(p_slug) < 2 or length(p_slug) > 48 then
    raise exception 'Slug must be 2–48 characters';
  end if;

  select u.email, u.raw_user_meta_data->>'full_name'
    into v_email, v_full_name
  from auth.users u
  where u.id = v_user_id;

  if v_email is null then
    raise exception 'User email not found';
  end if;

  insert into public.agencies (name, slug)
  values (trim(p_name), p_slug)
  returning * into v_agency;

  insert into public.agency_members (
    agency_id, user_id, role, email, full_name, joined_at
  ) values (
    v_agency.id,
    v_user_id,
    'agency_owner',
    v_email,
    nullif(trim(coalesce(v_full_name, '')), ''),
    now()
  );

  return v_agency;
end;
$$;

revoke all on function public.create_agency(text, text) from public;
grant execute on function public.create_agency(text, text) to authenticated;

-- ---------- PUBLIC INVITE LOOKUP (token only) ----------
create or replace function public.get_invite_by_token(p_token text)
returns table (
  agency_id uuid,
  agency_name text,
  agency_slug text,
  email text,
  role public.agency_role,
  expires_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    i.agency_id,
    a.name,
    a.slug,
    i.email,
    i.role,
    i.expires_at,
    i.accepted_at
  from public.agency_invites i
  join public.agencies a on a.id = i.agency_id
  where i.token = p_token
  limit 1;
end;
$$;

revoke all on function public.get_invite_by_token(text) from public;
grant execute on function public.get_invite_by_token(text) to anon, authenticated;

-- ---------- ACCEPT INVITE ----------
create or replace function public.accept_agency_invite(
  p_token text,
  p_full_name text default null
)
returns public.agency_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite public.agency_invites;
  v_member public.agency_members;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite
  from public.agency_invites
  where token = p_token
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'Invite already accepted';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  select email into v_user_email
  from auth.users
  where id = v_user_id;

  if lower(v_user_email) <> lower(v_invite.email) then
    raise exception 'Signed-in email does not match invite';
  end if;

  insert into public.agency_members (
    agency_id, user_id, role, email, full_name, invited_at, joined_at
  ) values (
    v_invite.agency_id,
    v_user_id,
    v_invite.role,
    v_invite.email,
    nullif(trim(coalesce(p_full_name, '')), ''),
    v_invite.created_at,
    now()
  )
  on conflict (agency_id, user_id) do update
    set
      joined_at = coalesce(public.agency_members.joined_at, now()),
      role = excluded.role,
      full_name = coalesce(excluded.full_name, public.agency_members.full_name)
  returning * into v_member;

  update public.agency_invites
  set accepted_at = now()
  where id = v_invite.id;

  return v_member;
end;
$$;

revoke all on function public.accept_agency_invite(text, text) from public;
grant execute on function public.accept_agency_invite(text, text) to authenticated;

-- ============================================================
-- Module 1: membership read policies for auth / multi-tenancy
-- Allows a signed-in user to resolve their own agency_members rows
-- without needing to know agency_id first (security definer helpers
-- alone cannot bootstrap that lookup under RLS).
-- ============================================================

create policy "agency_members: users can read own membership rows"
  on agency_members
  for select
  using (user_id = auth.uid());

-- Authenticated users can read agencies they belong to by slug lookup
-- after membership is known; keep existing members-can-read policy.
-- Also allow reading an agency when the user has any membership row
-- (including pending invite with joined_at null) so join flow (Module 2)
-- can resolve the tenant.
create policy "agencies: members and invitees can read"
  on agencies
  for select
  using (
    exists (
      select 1
      from agency_members
      where agency_members.agency_id = agencies.id
        and agency_members.user_id = auth.uid()
    )
  );

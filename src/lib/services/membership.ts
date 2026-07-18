import { hasRole, type AgencyRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Agency = Database["public"]["Tables"]["agencies"]["Row"];
type AgencyMember = Database["public"]["Tables"]["agency_members"]["Row"];

export type MembershipContext = {
  agency: Agency;
  member: AgencyMember;
  role: AgencyRole;
};

export type MembershipResult =
  | { ok: true; context: MembershipContext }
  | { ok: false; error: string; status: 401 | 403 | 404 };

/**
 * Resolve membership for the current user in a tenant by agency slug.
 * Role checks for features should use hasRole(context.role, minimum).
 */
export async function getMembershipBySlug(
  agencySlug: string,
): Promise<MembershipResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "Not authenticated", status: 401 };
  }

  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", agencySlug)
    .maybeSingle();

  if (agencyError) {
    return { ok: false, error: agencyError.message, status: 403 };
  }

  if (!agency) {
    return { ok: false, error: "Agency not found", status: 404 };
  }

  const { data: member, error: memberError } = await supabase
    .from("agency_members")
    .select("*")
    .eq("agency_id", agency.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    return { ok: false, error: memberError.message, status: 403 };
  }

  if (!member || !member.joined_at) {
    return {
      ok: false,
      error: "You are not a member of this agency",
      status: 403,
    };
  }

  return {
    ok: true,
    context: {
      agency,
      member,
      role: member.role,
    },
  };
}

/** Require membership and a minimum role. Fail closed. */
export async function requireMembership(
  agencySlug: string,
  minimumRole: AgencyRole = "agent",
): Promise<MembershipResult> {
  const result = await getMembershipBySlug(agencySlug);
  if (!result.ok) return result;

  if (!hasRole(result.context.role, minimumRole)) {
    return {
      ok: false,
      error: "Insufficient role for this action",
      status: 403,
    };
  }

  return result;
}

/** List agencies the current user has joined (joined_at set). */
export async function listJoinedAgencies(): Promise<
  { agency: Agency; role: AgencyRole }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: members, error: membersError } = await supabase
    .from("agency_members")
    .select("*")
    .eq("user_id", user.id)
    .not("joined_at", "is", null);

  if (membersError || !members?.length) return [];

  const agencyIds = members.map((m) => m.agency_id);
  const { data: agencies, error: agenciesError } = await supabase
    .from("agencies")
    .select("*")
    .in("id", agencyIds);

  if (agenciesError || !agencies) return [];

  const byId = new Map(agencies.map((a) => [a.id, a]));

  return members
    .map((member) => {
      const agency = byId.get(member.agency_id);
      if (!agency) return null;
      return { agency, role: member.role };
    })
    .filter((row): row is { agency: Agency; role: AgencyRole } => row !== null);
}

/**
 * Role hierarchy (highest → lowest):
 * super_admin > agency_owner > manager > agent
 *
 * Always call hasRole() from the service layer — never trust client-only checks.
 */

export const AGENCY_ROLES = [
  "super_admin",
  "agency_owner",
  "manager",
  "agent",
] as const;

export type AgencyRole = (typeof AGENCY_ROLES)[number];

const ROLE_RANK: Record<AgencyRole, number> = {
  super_admin: 4,
  agency_owner: 3,
  manager: 2,
  agent: 1,
};

/** True if `role` meets or exceeds `minimum` in the hierarchy. */
export function hasRole(role: AgencyRole | null | undefined, minimum: AgencyRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function isManagerOrAbove(role: AgencyRole | null | undefined): boolean {
  return hasRole(role, "manager");
}

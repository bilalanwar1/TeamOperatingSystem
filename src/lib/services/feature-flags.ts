import type { FeatureFlagKey } from "@/types/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getMembershipBySlug } from "@/lib/services/membership";
import { hasRole } from "@/lib/auth/roles";

export async function isFeatureEnabled(
  agencyId: string,
  flagKey: FeatureFlagKey,
  options?: { admin?: boolean },
): Promise<boolean> {
  const supabase = options?.admin ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("agency_id", agencyId)
    .eq("flag_key", flagKey)
    .maybeSingle();

  if (error || !data) return false;
  return data.enabled === true;
}

export async function setFeatureFlag(input: {
  agencySlug: string;
  flagKey: FeatureFlagKey;
  enabled: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const membership = await getMembershipBySlug(input.agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }
  if (!hasRole(membership.context.role, "manager")) {
    return { ok: false, error: "Managers and owners only" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("feature_flags").upsert(
    {
      agency_id: membership.context.agency.id,
      flag_key: input.flagKey,
      enabled: input.enabled,
    },
    { onConflict: "agency_id,flag_key" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function getFeatureFlag(
  agencySlug: string,
  flagKey: FeatureFlagKey,
): Promise<boolean> {
  const membership = await getMembershipBySlug(agencySlug);
  if (!membership.ok) return false;
  return isFeatureEnabled(membership.context.agency.id, flagKey);
}

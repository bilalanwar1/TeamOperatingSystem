"use server";

import { revalidatePath } from "next/cache";

import { refreshAgencyLeadScores } from "@/lib/services/ai-scoring";
import { getMembershipBySlug } from "@/lib/services/membership";
import { hasRole } from "@/lib/auth/roles";
import { isFeatureEnabled } from "@/lib/services/feature-flags";

export type AiActionState = {
  error?: string;
  success?: string;
};

export async function refreshLeadScoresAction(
  _prev: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const agencySlug = String(formData.get("agencySlug") ?? "");
  const membership = await getMembershipBySlug(agencySlug);
  if (!membership.ok) {
    return { error: membership.error };
  }
  if (!hasRole(membership.context.role, "manager")) {
    return { error: "Managers and owners only" };
  }

  const enabled = await isFeatureEnabled(
    membership.context.agency.id,
    "ai_insights",
  );
  if (!enabled) {
    return { error: "Enable AI insights on the Team page first." };
  }

  try {
    const scored = await refreshAgencyLeadScores(membership.context.agency.id);
    revalidatePath(`/a/${agencySlug}/ai`);
    revalidatePath(`/a/${agencySlug}/leads`);
    return {
      success: `Scored ${scored} open lead${scored === 1 ? "" : "s"}.`,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not refresh scores",
    };
  }
}

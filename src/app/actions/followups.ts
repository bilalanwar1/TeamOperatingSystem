"use server";

import { completeFollowup } from "@/lib/services/followups";

export type FollowupActionState = {
  error?: string;
  success?: string;
};

export async function completeFollowupAction(
  _prev: FollowupActionState,
  formData: FormData,
): Promise<FollowupActionState> {
  const result = await completeFollowup({
    agencySlug: String(formData.get("agencySlug") ?? ""),
    leadId: String(formData.get("leadId") ?? ""),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: "Follow-up completed." };
}

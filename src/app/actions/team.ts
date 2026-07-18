"use server";

import { setFeatureFlag } from "@/lib/services/feature-flags";
import { updateMemberWhatsappPhone } from "@/lib/services/team";

export type TeamActionState = {
  error?: string;
  success?: string;
};

export async function updateWhatsappPhoneAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const result = await updateMemberWhatsappPhone({
    agencySlug: String(formData.get("agencySlug") ?? ""),
    memberId: String(formData.get("memberId") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: "WhatsApp number saved." };
}

export async function toggleWhatsappModuleAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const result = await setFeatureFlag({
    agencySlug: String(formData.get("agencySlug") ?? ""),
    flagKey: "whatsapp_module",
    enabled,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return {
    success: enabled
      ? "WhatsApp module enabled for this agency."
      : "WhatsApp module disabled.",
  };
}

export async function toggleAiInsightsAction(
  _prev: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const result = await setFeatureFlag({
    agencySlug: String(formData.get("agencySlug") ?? ""),
    flagKey: "ai_insights",
    enabled,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return {
    success: enabled
      ? "AI insights enabled for this agency."
      : "AI insights disabled.",
  };
}

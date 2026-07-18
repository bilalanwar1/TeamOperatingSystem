"use server";

import { logOutreach } from "@/lib/services/activity";

export type OutreachActionState = {
  error?: string;
  success?: string;
};

export async function logOutreachAction(
  _prev: OutreachActionState,
  formData: FormData,
): Promise<OutreachActionState> {
  const result = await logOutreach({
    agencySlug: String(formData.get("agencySlug") ?? ""),
    channel: String(formData.get("channel") ?? "") as
      | "facebook"
      | "instagram"
      | "linkedin"
      | "whatsapp"
      | "email"
      | "calls",
    count: String(formData.get("count") ?? "1"),
    notes: String(formData.get("notes") ?? "") || undefined,
    source: "web",
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: "Outreach logged." };
}

"use server";

import { redirect } from "next/navigation";

import { createLead, updateLead } from "@/lib/services/leads";
import type { LeadSource, LeadStatus } from "@/types/database";

export type LeadActionState = {
  error?: string;
  success?: string;
};

export async function createLeadAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const agencySlug = String(formData.get("agencySlug") ?? "");
  const result = await createLead({
    agencySlug,
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    status: String(formData.get("status") ?? "new") as LeadStatus,
    source: String(formData.get("source") ?? "other") as LeadSource,
    notes: String(formData.get("notes") ?? "") || undefined,
    follow_up_date: String(formData.get("follow_up_date") ?? "") || undefined,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/a/${agencySlug}/leads/${result.lead.id}`);
}

export async function updateLeadAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const agencySlug = String(formData.get("agencySlug") ?? "");
  const leadId = String(formData.get("leadId") ?? "");

  const result = await updateLead({
    agencySlug,
    leadId,
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? "") || undefined,
    email: String(formData.get("email") ?? "") || undefined,
    status: String(formData.get("status") ?? "new") as LeadStatus,
    source: String(formData.get("source") ?? "other") as LeadSource,
    notes: String(formData.get("notes") ?? "") || undefined,
    follow_up_date: String(formData.get("follow_up_date") ?? "") || undefined,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: "Lead updated." };
}

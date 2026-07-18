import { getDubaiDayBounds, writeActivityEvent } from "@/lib/services/activity";
import { getMembershipBySlug } from "@/lib/services/membership";
import { createClient } from "@/lib/supabase/server";
import type { FollowupItem } from "@/lib/followups/types";
import type { FollowupCompletedPayload } from "@/types/activity";
import type { Database, Json } from "@/types/database";

export type { FollowupItem } from "@/lib/followups/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

export type FollowupsResult =
  | {
      ok: true;
      dayLabel: string;
      dueToday: FollowupItem[];
      overdue: FollowupItem[];
    }
  | { ok: false; error: string };

export type CompleteFollowupResult =
  | { ok: true; lead: Lead }
  | { ok: false; error: string };

/**
 * Due today + overdue follow-ups for the current agent's leads (Dubai date).
 */
export async function listFollowupsForCurrentAgent(
  agencySlug: string,
): Promise<FollowupsResult> {
  const membership = await getMembershipBySlug(agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }

  const { dayLabel } = getDubaiDayBounds();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("agency_id", membership.context.agency.id)
    .eq("agent_id", membership.context.member.id)
    .not("follow_up_date", "is", null)
    .lte("follow_up_date", dayLabel)
    .order("follow_up_date", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const dueToday: FollowupItem[] = [];
  const overdue: FollowupItem[] = [];

  for (const lead of data ?? []) {
    if (!lead.follow_up_date) continue;
    if (lead.follow_up_date === dayLabel) {
      dueToday.push({ lead, status: "due_today" });
    } else if (lead.follow_up_date < dayLabel) {
      overdue.push({ lead, status: "overdue" });
    }
  }

  return { ok: true, dayLabel, dueToday, overdue };
}

/**
 * Mark follow-up complete: clear date + log followup_completed.
 */
export async function completeFollowup(input: {
  agencySlug: string;
  leadId: string;
}): Promise<CompleteFollowupResult> {
  const membership = await getMembershipBySlug(input.agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }

  const supabase = await createClient();
  const { data: existing, error: loadError } = await supabase
    .from("leads")
    .select("*")
    .eq("agency_id", membership.context.agency.id)
    .eq("id", input.leadId)
    .maybeSingle();

  if (loadError) {
    return { ok: false, error: loadError.message };
  }
  if (!existing) {
    return { ok: false, error: "Lead not found" };
  }
  if (!existing.follow_up_date) {
    return { ok: false, error: "This lead has no follow-up date" };
  }

  const completedDate = existing.follow_up_date;

  const { data, error } = await supabase
    .from("leads")
    .update({
      follow_up_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.leadId)
    .eq("agency_id", membership.context.agency.id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload: FollowupCompletedPayload = {
    lead_id: data.id,
    name: data.name,
    follow_up_date: completedDate,
  };

  await writeActivityEvent({
    agencyId: membership.context.agency.id,
    agentId: membership.context.member.id,
    eventType: "followup_completed",
    payload: payload as unknown as Json,
  });

  return { ok: true, lead: data };
}

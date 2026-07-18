import { hasRole } from "@/lib/auth/roles";
import { normalizeWhatsappPhone } from "@/lib/integrations/whatsapp/parse";
import { getMembershipBySlug } from "@/lib/services/membership";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type AgencyMember = Database["public"]["Tables"]["agency_members"]["Row"];

export async function listAgencyRoster(agencySlug: string): Promise<
  | { ok: true; members: AgencyMember[] }
  | { ok: false; error: string }
> {
  const membership = await getMembershipBySlug(agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }
  if (!hasRole(membership.context.role, "manager")) {
    return { ok: false, error: "Managers and owners only" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agency_members")
    .select("*")
    .eq("agency_id", membership.context.agency.id)
    .not("joined_at", "is", null)
    .order("full_name", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, members: data ?? [] };
}

export async function updateMemberWhatsappPhone(input: {
  agencySlug: string;
  memberId: string;
  phone: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const membership = await getMembershipBySlug(input.agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }
  if (!hasRole(membership.context.role, "manager")) {
    return { ok: false, error: "Managers and owners only" };
  }

  const trimmed = input.phone.trim();
  const normalized = trimmed === "" ? null : normalizeWhatsappPhone(trimmed);
  if (trimmed && !normalized) {
    return {
      ok: false,
      error: "Use E.164 format, e.g. +971501234567",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("agency_members")
    .update({ whatsapp_phone: normalized })
    .eq("id", input.memberId)
    .eq("agency_id", membership.context.agency.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That WhatsApp number is already linked" };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

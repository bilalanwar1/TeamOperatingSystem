import { createAdminClient } from "@/lib/supabase/admin";
import { isFeatureEnabled } from "@/lib/services/feature-flags";
import { insertOutreachEvent } from "@/lib/services/activity";
import {
  normalizeWhatsappPhone,
  parseOutreachMessage,
} from "@/lib/integrations/whatsapp/parse";

export type WhatsappInboundMessage = {
  from: string;
  body: string;
  providerMessageId?: string;
};

export type WhatsappHandleResult =
  | {
      ok: true;
      handled: true;
      agencySlug: string;
      channel: string;
      count: number;
    }
  | { ok: true; handled: false; reason: string }
  | { ok: false; error: string };

/**
 * Map inbound WhatsApp → activity_events via shared insertOutreachEvent.
 * Gated by feature_flags.whatsapp_module per agency.
 */
export async function handleWhatsappInbound(
  message: WhatsappInboundMessage,
): Promise<WhatsappHandleResult> {
  const phone = normalizeWhatsappPhone(message.from);
  if (!phone) {
    return { ok: true, handled: false, reason: "Invalid phone number" };
  }

  const parsed = parseOutreachMessage(message.body);
  if (!parsed) {
    return {
      ok: true,
      handled: false,
      reason:
        'Send like: "5 whatsapp" or "log 3 calls" (facebook|instagram|linkedin|whatsapp|email|calls)',
    };
  }

  const admin = createAdminClient();
  const { data: member, error: memberError } = await admin
    .from("agency_members")
    .select("id, agency_id, joined_at")
    .eq("whatsapp_phone", phone)
    .maybeSingle();

  if (memberError) {
    return { ok: false, error: memberError.message };
  }
  if (!member || !member.joined_at) {
    return {
      ok: true,
      handled: false,
      reason: "No TeamOS agent linked to this WhatsApp number",
    };
  }

  const enabled = await isFeatureEnabled(member.agency_id, "whatsapp_module", {
    admin: true,
  });
  if (!enabled) {
    return {
      ok: true,
      handled: false,
      reason: "WhatsApp module is not enabled for this agency",
    };
  }

  const { data: agency } = await admin
    .from("agencies")
    .select("slug")
    .eq("id", member.agency_id)
    .maybeSingle();

  const result = await insertOutreachEvent({
    agencyId: member.agency_id,
    agentId: member.id,
    channel: parsed.channel,
    count: parsed.count,
    notes: parsed.raw,
    source: "whatsapp",
    useAdmin: true,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return {
    ok: true,
    handled: true,
    agencySlug: agency?.slug ?? "",
    channel: parsed.channel,
    count: parsed.count,
  };
}

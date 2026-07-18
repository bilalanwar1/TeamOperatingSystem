import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getMembershipBySlug } from "@/lib/services/membership";
import {
  OUTREACH_CHANNELS,
  type OutreachChannel,
  type OutreachLoggedPayload,
} from "@/types/activity";
import type { Database, Json } from "@/types/database";

export { OUTREACH_CHANNELS };

type ActivityEvent = Database["public"]["Tables"]["activity_events"]["Row"];

const logOutreachSchema = z.object({
  agencySlug: z.string().min(1),
  channel: z.enum(OUTREACH_CHANNELS),
  count: z.coerce.number().int().min(1).max(10_000),
  notes: z.string().trim().max(2000).optional(),
  source: z.enum(["web", "whatsapp"]).default("web"),
});

export type LogOutreachInput = z.input<typeof logOutreachSchema>;

export type LogOutreachResult =
  | { ok: true; event: ActivityEvent }
  | { ok: false; error: string };

export type ChannelTotals = Record<OutreachChannel, number> & { total: number };

/** Dubai day bounds (UAE agencies; no DST). */
export function getDubaiDayBounds(reference = new Date()): {
  startIso: string;
  endIso: string;
  dayLabel: string;
} {
  const dayLabel = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(reference);

  return {
    dayLabel,
    startIso: new Date(`${dayLabel}T00:00:00+04:00`).toISOString(),
    endIso: new Date(`${dayLabel}T23:59:59.999+04:00`).toISOString(),
  };
}

function emptyTotals(): ChannelTotals {
  return {
    facebook: 0,
    instagram: 0,
    linkedin: 0,
    whatsapp: 0,
    email: 0,
    calls: 0,
    total: 0,
  };
}

function isOutreachPayload(value: Json): value is OutreachLoggedPayload & Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.channel === "string" && typeof obj.count === "number";
}

/**
 * Shared insert used by dashboard (web) and WhatsApp webhook.
 * Prefer logOutreach() from UI; webhooks call this after identity resolution.
 */
export async function insertOutreachEvent(input: {
  agencyId: string;
  agentId: string;
  channel: OutreachChannel;
  count: number;
  notes?: string;
  source: "web" | "whatsapp";
  useAdmin?: boolean;
}): Promise<LogOutreachResult> {
  const payload: OutreachLoggedPayload = {
    channel: input.channel,
    count: input.count,
    notes: input.notes || undefined,
    source: input.source,
  };

  const supabase = input.useAdmin
    ? (await import("@/lib/supabase/admin")).createAdminClient()
    : await createClient();

  const { data, error } = await supabase
    .from("activity_events")
    .insert({
      agency_id: input.agencyId,
      agent_id: input.agentId,
      event_type: "outreach_logged",
      payload: payload as Json,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, event: data };
}

/**
 * Log outreach into the generic activity_events spine (authenticated agent).
 */
export async function logOutreach(
  input: LogOutreachInput,
): Promise<LogOutreachResult> {
  const parsed = logOutreachSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid outreach data",
    };
  }

  const membership = await getMembershipBySlug(parsed.data.agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }

  return insertOutreachEvent({
    agencyId: membership.context.agency.id,
    agentId: membership.context.member.id,
    channel: parsed.data.channel,
    count: parsed.data.count,
    notes: parsed.data.notes,
    source: parsed.data.source,
  });
}

/**
 * Low-level activity write used by other services (leads, follow-ups, etc.).
 * Prefer domain helpers (logOutreach, createLead) from UI / actions.
 */
export async function writeActivityEvent(input: {
  agencyId: string;
  agentId: string;
  eventType: string;
  payload?: Json;
}): Promise<LogOutreachResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_events")
    .insert({
      agency_id: input.agencyId,
      agent_id: input.agentId,
      event_type: input.eventType,
      payload: input.payload ?? {},
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, event: data };
}

/** Today's outreach totals for the current agent (Dubai calendar day). */
export async function getTodayOutreachTotalsForCurrentAgent(
  agencySlug: string,
): Promise<
  | { ok: true; totals: ChannelTotals; dayLabel: string; recent: ActivityEvent[] }
  | { ok: false; error: string }
> {
  const membership = await getMembershipBySlug(agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }

  const { startIso, endIso, dayLabel } = getDubaiDayBounds();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("agency_id", membership.context.agency.id)
    .eq("agent_id", membership.context.member.id)
    .eq("event_type", "outreach_logged")
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  const totals = emptyTotals();
  for (const event of data ?? []) {
    if (!isOutreachPayload(event.payload)) continue;
    const channel = event.payload.channel;
    if (!(OUTREACH_CHANNELS as readonly string[]).includes(channel)) continue;
    const count = Number(event.payload.count) || 0;
    totals[channel] += count;
    totals.total += count;
  }

  return {
    ok: true,
    totals,
    dayLabel,
    recent: data ?? [],
  };
}

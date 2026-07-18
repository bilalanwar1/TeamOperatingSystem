import { z } from "zod";

import { writeActivityEvent } from "@/lib/services/activity";
import { getMembershipBySlug } from "@/lib/services/membership";
import { createClient } from "@/lib/supabase/server";
import type {
  LeadCreatedPayload,
  LeadStatusChangedPayload,
} from "@/types/activity";
import type { Database, Json, LeadSource, LeadStatus } from "@/types/database";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/types/leads";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

const leadFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => v || null),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => {
      if (!v) return null;
      return v;
    })
    .refine((v) => v === null || z.string().email().safeParse(v).success, {
      message: "Enter a valid email",
    }),
  status: z.enum(LEAD_STATUSES).default("new"),
  source: z.enum(LEAD_SOURCES).default("other"),
  notes: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((v) => v || null),
  follow_up_date: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
      return v;
    }),
});

export type LeadResult =
  | { ok: true; lead: Lead }
  | { ok: false; error: string };

export type LeadListResult =
  | { ok: true; leads: Lead[] }
  | { ok: false; error: string };

export async function listLeads(agencySlug: string): Promise<LeadListResult> {
  const membership = await getMembershipBySlug(agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("agency_id", membership.context.agency.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, leads: data ?? [] };
}

export async function getLead(
  agencySlug: string,
  leadId: string,
): Promise<LeadResult> {
  const membership = await getMembershipBySlug(agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("agency_id", membership.context.agency.id)
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Lead not found" };
  }

  return { ok: true, lead: data };
}

export async function createLead(input: {
  agencySlug: string;
  name: string;
  phone?: string;
  email?: string;
  status?: LeadStatus;
  source?: LeadSource;
  notes?: string;
  follow_up_date?: string;
}): Promise<LeadResult> {
  const membership = await getMembershipBySlug(input.agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }

  const parsed = leadFieldsSchema.safeParse({
    name: input.name,
    phone: input.phone,
    email: input.email,
    status: input.status ?? "new",
    source: input.source ?? "other",
    notes: input.notes,
    follow_up_date: input.follow_up_date,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid lead data",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      agency_id: membership.context.agency.id,
      agent_id: membership.context.member.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      status: parsed.data.status,
      source: parsed.data.source,
      notes: parsed.data.notes,
      follow_up_date: parsed.data.follow_up_date,
    })
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload: LeadCreatedPayload = {
    lead_id: data.id,
    name: data.name,
    source: data.source,
    status: data.status,
  };

  await writeActivityEvent({
    agencyId: membership.context.agency.id,
    agentId: membership.context.member.id,
    eventType: "lead_created",
    payload: payload as unknown as Json,
  });

  return { ok: true, lead: data };
}

export async function updateLead(input: {
  agencySlug: string;
  leadId: string;
  name: string;
  phone?: string;
  email?: string;
  status?: LeadStatus;
  source?: LeadSource;
  notes?: string;
  follow_up_date?: string;
}): Promise<LeadResult> {
  const membership = await getMembershipBySlug(input.agencySlug);
  if (!membership.ok) {
    return { ok: false, error: membership.error };
  }

  const existing = await getLead(input.agencySlug, input.leadId);
  if (!existing.ok) {
    return existing;
  }

  const parsed = leadFieldsSchema.safeParse({
    name: input.name,
    phone: input.phone,
    email: input.email,
    status: input.status ?? existing.lead.status,
    source: input.source ?? existing.lead.source,
    notes: input.notes,
    follow_up_date: input.follow_up_date,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid lead data",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      status: parsed.data.status,
      source: parsed.data.source,
      notes: parsed.data.notes,
      follow_up_date: parsed.data.follow_up_date,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.leadId)
    .eq("agency_id", membership.context.agency.id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (existing.lead.status !== data.status) {
    const payload: LeadStatusChangedPayload = {
      lead_id: data.id,
      from: existing.lead.status,
      to: data.status,
    };
    await writeActivityEvent({
      agencyId: membership.context.agency.id,
      agentId: membership.context.member.id,
      eventType: "lead_status_changed",
      payload: payload as unknown as Json,
    });
  }

  return { ok: true, lead: data };
}

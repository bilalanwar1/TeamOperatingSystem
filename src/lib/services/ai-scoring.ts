import { getDubaiDayBounds } from "@/lib/services/activity";
import { isFeatureEnabled } from "@/lib/services/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type LeadScoreBreakdown = {
  score: number;
  reasons: string[];
  factors: {
    status: number;
    recency: number;
    source: number;
    followUp: number;
  };
};

export type ScoredLeadInsight = {
  leadId: string;
  score: number;
  reasons: string[];
  createdAt: string;
};

type LeadRow = {
  id: string;
  status: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  follow_up_date: string | null;
};

const STATUS_POINTS: Record<string, number> = {
  new: 25,
  contacted: 40,
  qualified: 70,
  negotiating: 85,
  closed_won: 95,
  closed_lost: 5,
};

const SOURCE_POINTS: Record<string, number> = {
  referral: 20,
  facebook: 12,
  instagram: 12,
  linkedin: 14,
  whatsapp: 14,
  email: 10,
  calls: 8,
  portal: 12,
  other: 5,
};

/**
 * Heuristic lead score (0–100). Deterministic — no LLM.
 * Ready to swap for a model later behind the same ai_insights store.
 */
export function scoreLead(lead: LeadRow, now = new Date()): LeadScoreBreakdown {
  const statusPts = STATUS_POINTS[lead.status] ?? 20;
  const sourceKey = (lead.source ?? "other").toLowerCase().replace(/\s+/g, "_");
  const sourcePts = SOURCE_POINTS[sourceKey] ?? SOURCE_POINTS.other;

  const updatedMs = new Date(lead.updated_at).getTime();
  const ageDays = Math.max(
    0,
    (now.getTime() - updatedMs) / (1000 * 60 * 60 * 24),
  );
  let recencyPts = 25;
  if (ageDays <= 1) recencyPts = 25;
  else if (ageDays <= 3) recencyPts = 20;
  else if (ageDays <= 7) recencyPts = 12;
  else if (ageDays <= 14) recencyPts = 6;
  else recencyPts = 0;

  let followUpPts = 0;
  const reasons: string[] = [];

  if (lead.status === "qualified" || lead.status === "negotiating") {
    reasons.push(`Strong pipeline status (${lead.status})`);
  } else if (lead.status === "new") {
    reasons.push("Fresh lead — early engagement window");
  } else if (lead.status === "closed_lost") {
    reasons.push("Marked lost — low priority");
  }

  if (lead.follow_up_date) {
    const due = new Date(`${lead.follow_up_date}T12:00:00+04:00`).getTime();
    if (due < now.getTime()) {
      followUpPts = 15;
      reasons.push("Follow-up overdue — act now");
    } else if (due - now.getTime() < 1000 * 60 * 60 * 48) {
      followUpPts = 10;
      reasons.push("Follow-up due within 48h");
    } else {
      followUpPts = 5;
      reasons.push("Follow-up scheduled");
    }
  } else if (lead.status !== "closed_won" && lead.status !== "closed_lost") {
    followUpPts = 0;
    reasons.push("No follow-up set");
  }

  if (ageDays <= 3 && lead.status !== "closed_lost") {
    reasons.push("Recently active");
  } else if (
    ageDays > 14 &&
    lead.status !== "closed_won" &&
    lead.status !== "closed_lost"
  ) {
    reasons.push("Going cold — no recent updates");
  }

  if (lead.source) {
    reasons.push(`Source: ${lead.source}`);
  }

  const raw =
    statusPts * 0.45 +
    recencyPts * 0.25 +
    sourcePts * 0.15 +
    followUpPts * 0.15;
  // Normalize roughly into 0–100 (max theoretical ~ 95*0.45 + 25*0.25 + 20*0.15 + 15*0.15 ≈ 68)
  // Scale so typical good leads land 55–90
  const score = Math.min(100, Math.max(0, Math.round(raw * 1.35)));

  return {
    score,
    reasons: reasons.slice(0, 4),
    factors: {
      status: statusPts,
      recency: recencyPts,
      source: sourcePts,
      followUp: followUpPts,
    },
  };
}

export type ScoreAgencyResult = {
  agencyId: string;
  agencySlug: string;
  scored: number;
  skipped: boolean;
  error?: string;
};

/**
 * Score open leads for every agency with ai_insights enabled.
 */
export async function runLeadScoringForEnabledAgencies(): Promise<{
  results: ScoreAgencyResult[];
}> {
  const admin = createAdminClient();
  const { data: agencies, error } = await admin
    .from("agencies")
    .select("id, slug");

  if (error) {
    throw new Error(error.message);
  }

  const results: ScoreAgencyResult[] = [];

  for (const agency of agencies ?? []) {
    const enabled = await isFeatureEnabled(agency.id, "ai_insights", {
      admin: true,
    });
    if (!enabled) {
      results.push({
        agencyId: agency.id,
        agencySlug: agency.slug,
        scored: 0,
        skipped: true,
      });
      continue;
    }

    try {
      const scored = await scoreAgencyLeads(agency.id, admin);
      results.push({
        agencyId: agency.id,
        agencySlug: agency.slug,
        scored,
        skipped: false,
      });
    } catch (err) {
      results.push({
        agencyId: agency.id,
        agencySlug: agency.slug,
        scored: 0,
        skipped: false,
        error: err instanceof Error ? err.message : "Scoring failed",
      });
    }
  }

  return { results };
}

async function scoreAgencyLeads(
  agencyId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
  const { data: leads, error } = await admin
    .from("leads")
    .select("id, status, source, created_at, updated_at, follow_up_date")
    .eq("agency_id", agencyId)
    .in("status", ["new", "contacted", "qualified", "negotiating"]);

  if (error) {
    throw new Error(error.message);
  }

  let scored = 0;
  const now = new Date();

  for (const lead of leads ?? []) {
    const breakdown = scoreLead(lead as LeadRow, now);
    const { error: insertError } = await admin.from("ai_insights").insert({
      agency_id: agencyId,
      lead_id: lead.id,
      agent_id: null,
      insight_type: "lead_score",
      payload: {
        score: breakdown.score,
        reasons: breakdown.reasons,
        factors: breakdown.factors,
        version: 1,
        day: getDubaiDayBounds().dayLabel,
      } as unknown as Json,
    });
    if (!insertError) scored += 1;
  }

  return scored;
}

/**
 * Latest lead_score insight per lead (user-scoped via RLS).
 */
export async function getLatestLeadScores(
  agencyId: string,
): Promise<Map<string, ScoredLeadInsight>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_insights")
    .select("lead_id, payload, created_at")
    .eq("agency_id", agencyId)
    .eq("insight_type", "lead_score")
    .not("lead_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, ScoredLeadInsight>();
  for (const row of data ?? []) {
    if (!row.lead_id || map.has(row.lead_id)) continue;
    const payload = row.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      continue;
    }
    const record = payload as Record<string, unknown>;
    const score = typeof record.score === "number" ? record.score : 0;
    const reasons = Array.isArray(record.reasons)
      ? record.reasons.filter((r): r is string => typeof r === "string")
      : [];
    map.set(row.lead_id, {
      leadId: row.lead_id,
      score,
      reasons,
      createdAt: row.created_at,
    });
  }
  return map;
}

export async function getRecentSlippingInsights(agencyId: string): Promise<
  Array<{
    agentId: string | null;
    name: string;
    thisWeek: number;
    lastWeek: number;
    dropPercent: number;
    createdAt: string;
  }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_insights")
    .select("agent_id, payload, created_at")
    .eq("agency_id", agencyId)
    .eq("insight_type", "agent_slipping")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const payload =
      row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {};
    return {
      agentId: row.agent_id,
      name: typeof payload.name === "string" ? payload.name : "Agent",
      thisWeek: typeof payload.this_week === "number" ? payload.this_week : 0,
      lastWeek: typeof payload.last_week === "number" ? payload.last_week : 0,
      dropPercent:
        typeof payload.drop_percent === "number" ? payload.drop_percent : 0,
      createdAt: row.created_at,
    };
  });
}

/**
 * Manual score refresh for one agency (manager action).
 */
export async function refreshAgencyLeadScores(
  agencyId: string,
): Promise<number> {
  const admin = createAdminClient();
  const enabled = await isFeatureEnabled(agencyId, "ai_insights", {
    admin: true,
  });
  if (!enabled) {
    throw new Error("AI insights is not enabled for this agency.");
  }
  return scoreAgencyLeads(agencyId, admin);
}

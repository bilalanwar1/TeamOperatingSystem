import { getDubaiDayBounds } from "@/lib/services/activity";
import { getMembershipBySlug } from "@/lib/services/membership";
import { hasRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { LEAD_SOURCE_LABELS, LEAD_SOURCES } from "@/types/leads";
import type { LeadSource } from "@/types/database";
import type { Json } from "@/types/database";

export type SourceConversionRow = {
  source: LeadSource;
  label: string;
  created: number;
  closedWon: number;
  conversionRate: number;
};

export type TrendPoint = {
  day: string;
  messages: number;
  leads: number;
  closings: number;
};

export type InsightsData = {
  rangeLabel: string;
  sources: SourceConversionRow[];
  trends: TrendPoint[];
  totals: {
    leadsCreated: number;
    closedWon: number;
    overallConversionRate: number;
  };
};

export type InsightsResult =
  | { ok: true; data: InsightsData }
  | { ok: false; error: string; status: 401 | 403 };

function dubaiDayOffset(dayLabel: string, daysBack: number): string {
  const base = new Date(`${dayLabel}T12:00:00+04:00`);
  base.setTime(base.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base);
}

function outreachCount(payload: Json): number {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
  const count = (payload as Record<string, unknown>).count;
  return typeof count === "number" ? count : 0;
}

/**
 * 14-day trends + conversion by lead source (managers+).
 */
export async function getAgencyInsights(
  agencySlug: string,
): Promise<InsightsResult> {
  const membership = await getMembershipBySlug(agencySlug);
  if (!membership.ok) {
    return {
      ok: false,
      error: membership.error,
      status: membership.status === 401 ? 401 : 403,
    };
  }
  if (!hasRole(membership.context.role, "manager")) {
    return { ok: false, error: "Managers and owners only", status: 403 };
  }

  const { dayLabel, endIso } = getDubaiDayBounds();
  const startDay = dubaiDayOffset(dayLabel, 13);
  const startIso = new Date(`${startDay}T00:00:00+04:00`).toISOString();
  const dayLabels: string[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    dayLabels.push(dubaiDayOffset(dayLabel, i));
  }

  const supabase = await createClient();
  const agencyId = membership.context.agency.id;

  const [{ data: leads, error: leadsError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, source, status, created_at")
        .eq("agency_id", agencyId)
        .gte("created_at", startIso)
        .lte("created_at", endIso),
      supabase
        .from("activity_events")
        .select("event_type, payload, created_at")
        .eq("agency_id", agencyId)
        .gte("created_at", startIso)
        .lte("created_at", endIso),
    ]);

  if (leadsError) {
    return { ok: false, error: leadsError.message, status: 403 };
  }
  if (eventsError) {
    return { ok: false, error: eventsError.message, status: 403 };
  }

  const createdBySource = new Map<LeadSource, number>();
  const closedBySource = new Map<LeadSource, number>();
  for (const source of LEAD_SOURCES) {
    createdBySource.set(source, 0);
    closedBySource.set(source, 0);
  }

  for (const lead of leads ?? []) {
    createdBySource.set(lead.source, (createdBySource.get(lead.source) ?? 0) + 1);
    if (lead.status === "closed_won") {
      closedBySource.set(lead.source, (closedBySource.get(lead.source) ?? 0) + 1);
    }
  }

  // Also count closed_won transitions in period for conversion (leads created earlier may close now)
  // Primary conversion: closed_won among leads created in window (status on lead row).
  const sources: SourceConversionRow[] = LEAD_SOURCES.map((source) => {
    const created = createdBySource.get(source) ?? 0;
    const closedWon = closedBySource.get(source) ?? 0;
    return {
      source,
      label: LEAD_SOURCE_LABELS[source],
      created,
      closedWon,
      conversionRate: created === 0 ? 0 : Math.round((closedWon / created) * 1000) / 10,
    };
  }).filter((row) => row.created > 0 || row.closedWon > 0);

  sources.sort((a, b) => b.created - a.created);

  const trendMap = new Map<string, TrendPoint>();
  for (const day of dayLabels) {
    trendMap.set(day, { day: day.slice(5), messages: 0, leads: 0, closings: 0 });
  }

  for (const event of events ?? []) {
    const eventDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(event.created_at));
    const point = trendMap.get(eventDay);
    if (!point) continue;

    if (event.event_type === "outreach_logged") {
      point.messages += outreachCount(event.payload);
    } else if (event.event_type === "lead_created") {
      point.leads += 1;
    } else if (event.event_type === "lead_status_changed") {
      const payload =
        event.payload &&
        typeof event.payload === "object" &&
        !Array.isArray(event.payload)
          ? (event.payload as Record<string, unknown>)
          : {};
      if (payload.to === "closed_won") point.closings += 1;
    }
  }

  const totalsCreated = sources.reduce((s, r) => s + r.created, 0);
  const totalsClosed = sources.reduce((s, r) => s + r.closedWon, 0);

  return {
    ok: true,
    data: {
      rangeLabel: `${startDay} → ${dayLabel} (Dubai)`,
      sources,
      trends: dayLabels.map((d) => trendMap.get(d)!),
      totals: {
        leadsCreated: totalsCreated,
        closedWon: totalsClosed,
        overallConversionRate:
          totalsCreated === 0
            ? 0
            : Math.round((totalsClosed / totalsCreated) * 1000) / 10,
      },
    },
  };
}

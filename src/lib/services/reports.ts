import { getDubaiDayBounds } from "@/lib/services/activity";
import { getMembershipBySlug } from "@/lib/services/membership";
import { createClient } from "@/lib/supabase/server";
import type {
  AgencyReportTotals,
  AgentReportRow,
  ReportPeriod,
  ReportsData,
} from "@/lib/reports/types";
import type { Database, Json } from "@/types/database";

export type {
  AgencyReportTotals,
  AgentReportRow,
  ReportPeriod,
  ReportsData,
} from "@/lib/reports/types";

type AgencyMember = Database["public"]["Tables"]["agency_members"]["Row"];

export type ReportsResult =
  | { ok: true; data: ReportsData }
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

function getReportBounds(period: ReportPeriod): {
  startIso: string;
  endIso: string;
  periodLabel: string;
} {
  const { dayLabel, startIso, endIso } = getDubaiDayBounds();
  if (period === "daily") {
    return {
      startIso,
      endIso,
      periodLabel: `Daily · ${dayLabel} (Dubai)`,
    };
  }
  const weekStart = dubaiDayOffset(dayLabel, 6);
  return {
    startIso: new Date(`${weekStart}T00:00:00+04:00`).toISOString(),
    endIso,
    periodLabel: `Weekly · ${weekStart} → ${dayLabel} (Dubai)`,
  };
}

function outreachCount(payload: Json): number {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
  const count = (payload as Record<string, unknown>).count;
  return typeof count === "number" ? count : 0;
}

function displayName(member: AgencyMember): string {
  return member.full_name?.trim() || member.email;
}

/**
 * Daily/weekly summary per agent + agency rollup from activity_events.
 */
export async function getAgencyReports(input: {
  agencySlug: string;
  period?: ReportPeriod;
}): Promise<ReportsResult> {
  const period = input.period === "weekly" ? "weekly" : "daily";
  const membership = await getMembershipBySlug(input.agencySlug);
  if (!membership.ok) {
    return {
      ok: false,
      error: membership.error,
      status: membership.status === 401 ? 401 : 403,
    };
  }

  const { agency } = membership.context;
  const bounds = getReportBounds(period);
  const supabase = await createClient();

  const [{ data: members, error: membersError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase
        .from("agency_members")
        .select("*")
        .eq("agency_id", agency.id)
        .not("joined_at", "is", null)
        .order("full_name", { ascending: true }),
      supabase
        .from("activity_events")
        .select("*")
        .eq("agency_id", agency.id)
        .gte("created_at", bounds.startIso)
        .lte("created_at", bounds.endIso),
    ]);

  if (membersError) {
    return { ok: false, error: membersError.message, status: 403 };
  }
  if (eventsError) {
    return { ok: false, error: eventsError.message, status: 403 };
  }

  const roster = members ?? [];
  const rows = new Map<string, AgentReportRow>();

  for (const member of roster) {
    rows.set(member.id, {
      agentId: member.id,
      name: displayName(member),
      email: member.email,
      role: member.role,
      messages: 0,
      leadsCreated: 0,
      statusChanges: 0,
      closings: 0,
      followups: 0,
    });
  }

  for (const event of events ?? []) {
    const row = rows.get(event.agent_id);
    if (!row) continue;

    switch (event.event_type) {
      case "outreach_logged":
        row.messages += outreachCount(event.payload);
        break;
      case "lead_created":
        row.leadsCreated += 1;
        break;
      case "lead_status_changed": {
        row.statusChanges += 1;
        const payload =
          event.payload &&
          typeof event.payload === "object" &&
          !Array.isArray(event.payload)
            ? (event.payload as Record<string, unknown>)
            : {};
        if (payload.to === "closed_won") {
          row.closings += 1;
        }
        break;
      }
      case "followup_completed":
        row.followups += 1;
        break;
      default:
        break;
    }
  }

  const agents = Array.from(rows.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const agencyTotals: AgencyReportTotals = {
    messages: 0,
    leadsCreated: 0,
    statusChanges: 0,
    closings: 0,
    followups: 0,
    activeAgents: 0,
  };

  for (const agent of agents) {
    agencyTotals.messages += agent.messages;
    agencyTotals.leadsCreated += agent.leadsCreated;
    agencyTotals.statusChanges += agent.statusChanges;
    agencyTotals.closings += agent.closings;
    agencyTotals.followups += agent.followups;
    if (
      agent.messages +
        agent.leadsCreated +
        agent.statusChanges +
        agent.followups >
      0
    ) {
      agencyTotals.activeAgents += 1;
    }
  }

  return {
    ok: true,
    data: {
      period,
      periodLabel: bounds.periodLabel,
      agencyName: agency.name,
      agencySlug: agency.slug,
      agents,
      agency: agencyTotals,
    },
  };
}

import { hasRole } from "@/lib/auth/roles";
import { getDubaiDayBounds } from "@/lib/services/activity";
import { getMembershipBySlug } from "@/lib/services/membership";
import { createClient } from "@/lib/supabase/server";
import { OUTREACH_CHANNELS } from "@/types/activity";
import type { Database, Json } from "@/types/database";

type AgencyMember = Database["public"]["Tables"]["agency_members"]["Row"];
type ActivityEvent = Database["public"]["Tables"]["activity_events"]["Row"];

export type AgentPerformance = {
  agentId: string;
  name: string;
  email: string;
  role: AgencyMember["role"];
  outreachToday: number;
  outreachWeek: number;
  leadsCreatedToday: number;
  leadsCreatedWeek: number;
  closedWonWeek: number;
};

export type ActivityFeedItem = {
  id: string;
  eventType: string;
  createdAt: string;
  agentName: string;
  agentEmail: string;
  summary: string;
};

export type DailyOutreachPoint = {
  day: string;
  outreach: number;
};

export type ManagerDashboardData = {
  dayLabel: string;
  weekLabel: string;
  feed: ActivityFeedItem[];
  agents: AgentPerformance[];
  dailyOutreach: DailyOutreachPoint[];
  teamOutreachToday: number;
  teamOutreachWeek: number;
};

export type ManagerDashboardResult =
  | { ok: true; data: ManagerDashboardData }
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

function getDubaiWeekBounds(reference = new Date()): {
  startIso: string;
  endIso: string;
  weekLabel: string;
  dayLabels: string[];
} {
  const { dayLabel, endIso } = getDubaiDayBounds(reference);
  const dayLabels: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    dayLabels.push(dubaiDayOffset(dayLabel, i));
  }
  const weekStart = dayLabels[0]!;
  return {
    startIso: new Date(`${weekStart}T00:00:00+04:00`).toISOString(),
    endIso,
    weekLabel: `${weekStart} → ${dayLabel}`,
    dayLabels,
  };
}

function outreachCount(payload: Json): number {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
  const count = (payload as Record<string, unknown>).count;
  return typeof count === "number" ? count : 0;
}

function summarizeEvent(event: ActivityEvent): string {
  const payload =
    event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
      ? (event.payload as Record<string, unknown>)
      : {};

  switch (event.event_type) {
    case "outreach_logged": {
      const channel = String(payload.channel ?? "outreach");
      const count = Number(payload.count ?? 0);
      const label = OUTREACH_CHANNELS.includes(
        channel as (typeof OUTREACH_CHANNELS)[number],
      )
        ? channel
        : "outreach";
      return `Logged ${count} ${label}`;
    }
    case "lead_created":
      return `Created lead “${String(payload.name ?? "Untitled")}”`;
    case "lead_status_changed":
      return `Lead status ${String(payload.from ?? "?")} → ${String(payload.to ?? "?")}`;
      case "followup_completed":
      return `Completed follow-up for “${String(payload.name ?? "lead")}”`;
    default:
      return event.event_type;
  }
}

function displayName(member: AgencyMember): string {
  return member.full_name?.trim() || member.email;
}

/**
 * Manager/owner overview sourced from activity_events + roster.
 * Role check is enforced here (fail closed).
 */
export async function getManagerDashboard(
  agencySlug: string,
): Promise<ManagerDashboardResult> {
  const membership = await getMembershipBySlug(agencySlug);
  if (!membership.ok) {
    return {
      ok: false,
      error: membership.error,
      status: membership.status === 401 ? 401 : 403,
    };
  }

  if (!hasRole(membership.context.role, "manager")) {
    return {
      ok: false,
      error: "Managers and owners only",
      status: 403,
    };
  }

  const { agency } = membership.context;
  const today = getDubaiDayBounds();
  const week = getDubaiWeekBounds();
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
        .gte("created_at", week.startIso)
        .lte("created_at", week.endIso)
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

  if (membersError) {
    return { ok: false, error: membersError.message, status: 403 };
  }
  if (eventsError) {
    return { ok: false, error: eventsError.message, status: 403 };
  }

  const roster = members ?? [];
  const byId = new Map(roster.map((m) => [m.id, m]));
  const allEvents = events ?? [];

  const agents: AgentPerformance[] = roster.map((member) => ({
    agentId: member.id,
    name: displayName(member),
    email: member.email,
    role: member.role,
    outreachToday: 0,
    outreachWeek: 0,
    leadsCreatedToday: 0,
    leadsCreatedWeek: 0,
    closedWonWeek: 0,
  }));
  const perfById = new Map(agents.map((a) => [a.agentId, a]));

  const dailyMap = new Map(week.dayLabels.map((d) => [d, 0]));

  for (const event of allEvents) {
    const perf = perfById.get(event.agent_id);
    if (!perf) continue;

    const eventDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(event.created_at));
    const isToday = eventDay === today.dayLabel;

    if (event.event_type === "outreach_logged") {
      const count = outreachCount(event.payload);
      perf.outreachWeek += count;
      if (isToday) perf.outreachToday += count;
      dailyMap.set(eventDay, (dailyMap.get(eventDay) ?? 0) + count);
    }

    if (event.event_type === "lead_created") {
      perf.leadsCreatedWeek += 1;
      if (isToday) perf.leadsCreatedToday += 1;
    }

    if (event.event_type === "lead_status_changed") {
      const payload =
        event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
          ? (event.payload as Record<string, unknown>)
          : {};
      if (payload.to === "closed_won") {
        perf.closedWonWeek += 1;
      }
    }
  }

  agents.sort((a, b) => b.outreachToday - a.outreachToday || a.name.localeCompare(b.name));

  const feed: ActivityFeedItem[] = allEvents.slice(0, 40).map((event) => {
    const member = byId.get(event.agent_id);
    return {
      id: event.id,
      eventType: event.event_type,
      createdAt: event.created_at,
      agentName: member ? displayName(member) : "Unknown agent",
      agentEmail: member?.email ?? "",
      summary: summarizeEvent(event),
    };
  });

  const dailyOutreach: DailyOutreachPoint[] = week.dayLabels.map((day) => ({
    day: day.slice(5), // MM-DD
    outreach: dailyMap.get(day) ?? 0,
  }));

  return {
    ok: true,
    data: {
      dayLabel: today.dayLabel,
      weekLabel: week.weekLabel,
      feed,
      agents,
      dailyOutreach,
      teamOutreachToday: agents.reduce((sum, a) => sum + a.outreachToday, 0),
      teamOutreachWeek: agents.reduce((sum, a) => sum + a.outreachWeek, 0),
    },
  };
}

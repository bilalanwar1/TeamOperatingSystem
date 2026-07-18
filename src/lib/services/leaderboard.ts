import { getDubaiDayBounds } from "@/lib/services/activity";
import { getMembershipBySlug } from "@/lib/services/membership";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

type AgencyMember = Database["public"]["Tables"]["agency_members"]["Row"];

export type LeaderboardPeriod = "week" | "month";

export type LeaderboardMetric = "messages" | "leads" | "closings";

export type LeaderboardEntry = {
  rank: number;
  agentId: string;
  name: string;
  email: string;
  role: AgencyMember["role"];
  messages: number;
  leads: number;
  closings: number;
  isCurrentUser: boolean;
};

export type LeaderboardData = {
  period: LeaderboardPeriod;
  periodLabel: string;
  entries: LeaderboardEntry[];
  rankedBy: LeaderboardMetric;
};

export type LeaderboardResult =
  | { ok: true; data: LeaderboardData }
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

function getPeriodBounds(period: LeaderboardPeriod): {
  startIso: string;
  endIso: string;
  periodLabel: string;
} {
  const { dayLabel, endIso } = getDubaiDayBounds();
  const daysBack = period === "week" ? 6 : 29;
  const startDay = dubaiDayOffset(dayLabel, daysBack);
  return {
    startIso: new Date(`${startDay}T00:00:00+04:00`).toISOString(),
    endIso,
    periodLabel: `${startDay} → ${dayLabel} (Dubai)`,
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

function sortKey(entry: LeaderboardEntry, metric: LeaderboardMetric): number {
  if (metric === "messages") return entry.messages;
  if (metric === "leads") return entry.leads;
  return entry.closings;
}

/**
 * Rank agents from activity_events only — no dedicated leaderboard tables.
 * Visible to all joined agency members.
 */
export async function getLeaderboard(input: {
  agencySlug: string;
  period?: LeaderboardPeriod;
  rankedBy?: LeaderboardMetric;
}): Promise<LeaderboardResult> {
  const period = input.period === "month" ? "month" : "week";
  const rankedBy = input.rankedBy ?? "messages";

  const membership = await getMembershipBySlug(input.agencySlug);
  if (!membership.ok) {
    return {
      ok: false,
      error: membership.error,
      status: membership.status === 401 ? 401 : 403,
    };
  }

  const { agency, member: currentMember } = membership.context;
  const bounds = getPeriodBounds(period);
  const supabase = await createClient();

  const [{ data: members, error: membersError }, { data: events, error: eventsError }] =
    await Promise.all([
      supabase
        .from("agency_members")
        .select("*")
        .eq("agency_id", agency.id)
        .not("joined_at", "is", null),
      supabase
        .from("activity_events")
        .select("*")
        .eq("agency_id", agency.id)
        .gte("created_at", bounds.startIso)
        .lte("created_at", bounds.endIso)
        .in("event_type", [
          "outreach_logged",
          "lead_created",
          "lead_status_changed",
        ]),
    ]);

  if (membersError) {
    return { ok: false, error: membersError.message, status: 403 };
  }
  if (eventsError) {
    return { ok: false, error: eventsError.message, status: 403 };
  }

  const roster = members ?? [];
  const tallies = new Map<
    string,
    { messages: number; leads: number; closings: number }
  >();

  for (const member of roster) {
    tallies.set(member.id, { messages: 0, leads: 0, closings: 0 });
  }

  for (const event of events ?? []) {
    const tally = tallies.get(event.agent_id);
    if (!tally) continue;

    if (event.event_type === "outreach_logged") {
      tally.messages += outreachCount(event.payload);
    } else if (event.event_type === "lead_created") {
      tally.leads += 1;
    } else if (event.event_type === "lead_status_changed") {
      const payload =
        event.payload &&
        typeof event.payload === "object" &&
        !Array.isArray(event.payload)
          ? (event.payload as Record<string, unknown>)
          : {};
      if (payload.to === "closed_won") {
        tally.closings += 1;
      }
    }
  }

  const unsorted: Omit<LeaderboardEntry, "rank">[] = roster.map((member) => {
    const tally = tallies.get(member.id) ?? {
      messages: 0,
      leads: 0,
      closings: 0,
    };
    return {
      agentId: member.id,
      name: displayName(member),
      email: member.email,
      role: member.role,
      messages: tally.messages,
      leads: tally.leads,
      closings: tally.closings,
      isCurrentUser: member.id === currentMember.id,
    };
  });

  unsorted.sort((a, b) => {
    const diff = sortKey(b as LeaderboardEntry, rankedBy) - sortKey(a as LeaderboardEntry, rankedBy);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  const entries: LeaderboardEntry[] = unsorted.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  return {
    ok: true,
    data: {
      period,
      periodLabel: bounds.periodLabel,
      entries,
      rankedBy,
    },
  };
}

import { escapeHtml, sendEmail } from "@/lib/email/resend";
import { getDubaiDayBounds } from "@/lib/services/activity";
import { isFeatureEnabled } from "@/lib/services/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type SlippingAgent = {
  agentId: string;
  name: string;
  email: string;
  thisWeek: number;
  lastWeek: number;
  dropPercent: number;
};

export type SlippingAgencyResult = {
  agencyId: string;
  agencySlug: string;
  agencyName: string;
  slipping: SlippingAgent[];
  emailed: boolean;
  skipped: boolean;
  error?: string;
};

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

/** offsetWeeks 0 = last 7 days ending today; 1 = the 7 days before that */
function weekBounds(offsetWeeks: number): { startIso: string; endIso: string } {
  const { dayLabel } = getDubaiDayBounds();
  const end = dubaiDayOffset(dayLabel, offsetWeeks * 7);
  const start = dubaiDayOffset(dayLabel, offsetWeeks * 7 + 6);
  return {
    startIso: new Date(`${start}T00:00:00+04:00`).toISOString(),
    endIso: new Date(`${end}T23:59:59.999+04:00`).toISOString(),
  };
}

function outreachCount(payload: Json): number {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
  const count = (payload as Record<string, unknown>).count;
  return typeof count === "number" ? count : 0;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Detect agents whose outreach dropped sharply vs the prior week.
 * Writes ai_insights + emails managers when ai_insights flag is on.
 */
export async function runAgentsSlippingAlerts(): Promise<{
  results: SlippingAgencyResult[];
}> {
  const admin = createAdminClient();
  const thisWeek = weekBounds(0);
  const lastWeek = weekBounds(1);

  const { data: agencies, error } = await admin
    .from("agencies")
    .select("id, name, slug");

  if (error) {
    throw new Error(error.message);
  }

  const results: SlippingAgencyResult[] = [];

  for (const agency of agencies ?? []) {
    const enabled = await isFeatureEnabled(agency.id, "ai_insights", {
      admin: true,
    });
    if (!enabled) {
      results.push({
        agencyId: agency.id,
        agencySlug: agency.slug,
        agencyName: agency.name,
        slipping: [],
        emailed: false,
        skipped: true,
      });
      continue;
    }

    try {
      const slipping = await findSlippingAgents(
        agency.id,
        thisWeek,
        lastWeek,
        admin,
      );

      for (const agent of slipping) {
        await admin.from("ai_insights").insert({
          agency_id: agency.id,
          lead_id: null,
          agent_id: agent.agentId,
          insight_type: "agent_slipping",
          payload: {
            name: agent.name,
            email: agent.email,
            this_week: agent.thisWeek,
            last_week: agent.lastWeek,
            drop_percent: agent.dropPercent,
            version: 1,
          } as unknown as Json,
        });
      }

      let emailed = false;
      if (slipping.length > 0) {
        const { data: managers } = await admin
          .from("agency_members")
          .select("email")
          .eq("agency_id", agency.id)
          .not("joined_at", "is", null)
          .in("role", ["manager", "agency_owner", "super_admin"]);

        const recipients = Array.from(
          new Set((managers ?? []).map((m) => m.email).filter(Boolean)),
        );

        if (recipients.length > 0) {
          const rows = slipping
            .map(
              (a) =>
                `<li><strong>${escapeHtml(a.name)}</strong> — ${a.thisWeek} msgs this week vs ${a.lastWeek} last week (−${a.dropPercent}%)</li>`,
            )
            .join("");
          const send = await sendEmail({
            to: recipients,
            subject: `[TeamOS] ${agency.name}: ${slipping.length} agent(s) slipping`,
            html: `
              <h2>${escapeHtml(agency.name)} — weekly activity alert</h2>
              <p>These agents dropped 40%+ in outreach vs the prior week:</p>
              <ul>${rows}</ul>
              <p><a href="${escapeHtml(`${appUrl()}/a/${agency.slug}/ai`)}">Open AI insights</a></p>
            `,
          });
          emailed = send.ok && send.emailed;
        }
      }

      results.push({
        agencyId: agency.id,
        agencySlug: agency.slug,
        agencyName: agency.name,
        slipping,
        emailed,
        skipped: false,
      });
    } catch (err) {
      results.push({
        agencyId: agency.id,
        agencySlug: agency.slug,
        agencyName: agency.name,
        slipping: [],
        emailed: false,
        skipped: false,
        error: err instanceof Error ? err.message : "Slipping check failed",
      });
    }
  }

  return { results };
}

async function findSlippingAgents(
  agencyId: string,
  thisWeek: { startIso: string; endIso: string },
  lastWeek: { startIso: string; endIso: string },
  admin: ReturnType<typeof createAdminClient>,
): Promise<SlippingAgent[]> {
  const { data: members } = await admin
    .from("agency_members")
    .select("id, full_name, email, role")
    .eq("agency_id", agencyId)
    .not("joined_at", "is", null);

  const { data: events } = await admin
    .from("activity_events")
    .select("agent_id, event_type, payload, created_at")
    .eq("agency_id", agencyId)
    .eq("event_type", "outreach_logged")
    .gte("created_at", lastWeek.startIso)
    .lte("created_at", thisWeek.endIso);

  const thisTotals = new Map<string, number>();
  const lastTotals = new Map<string, number>();

  for (const event of events ?? []) {
    const count = outreachCount(event.payload);
    const created = event.created_at;
    if (created >= thisWeek.startIso && created <= thisWeek.endIso) {
      thisTotals.set(
        event.agent_id,
        (thisTotals.get(event.agent_id) ?? 0) + count,
      );
    } else if (created >= lastWeek.startIso && created <= lastWeek.endIso) {
      lastTotals.set(
        event.agent_id,
        (lastTotals.get(event.agent_id) ?? 0) + count,
      );
    }
  }

  const slipping: SlippingAgent[] = [];
  for (const member of members ?? []) {
    if (member.role === "super_admin") continue;
    const thisWeekCount = thisTotals.get(member.id) ?? 0;
    const lastWeekCount = lastTotals.get(member.id) ?? 0;
    if (lastWeekCount < 10) continue; // need meaningful baseline
    const dropPercent = Math.round(
      ((lastWeekCount - thisWeekCount) / lastWeekCount) * 100,
    );
    if (dropPercent >= 40) {
      slipping.push({
        agentId: member.id,
        name: member.full_name?.trim() || member.email,
        email: member.email,
        thisWeek: thisWeekCount,
        lastWeek: lastWeekCount,
        dropPercent,
      });
    }
  }

  slipping.sort((a, b) => b.dropPercent - a.dropPercent);
  return slipping;
}

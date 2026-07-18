import { escapeHtml, sendEmail } from "@/lib/email/resend";
import { getDubaiDayBounds } from "@/lib/services/activity";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export type DigestAgencyResult = {
  agencyId: string;
  agencyName: string;
  agencySlug: string;
  recipients: string[];
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

function yesterdayDubaiBounds(): {
  dayLabel: string;
  startIso: string;
  endIso: string;
} {
  const { dayLabel: today } = getDubaiDayBounds();
  const dayLabel = dubaiDayOffset(today, 1);
  return {
    dayLabel,
    startIso: new Date(`${dayLabel}T00:00:00+04:00`).toISOString(),
    endIso: new Date(`${dayLabel}T23:59:59.999+04:00`).toISOString(),
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
 * Send yesterday's activity digest to every agency's managers/owners.
 * Uses service role — cron/trusted jobs only.
 */
export async function sendDailyManagerDigests(): Promise<{
  dayLabel: string;
  results: DigestAgencyResult[];
}> {
  const bounds = yesterdayDubaiBounds();
  const admin = createAdminClient();

  const { data: agencies, error: agenciesError } = await admin
    .from("agencies")
    .select("id, name, slug");

  if (agenciesError) {
    throw new Error(agenciesError.message);
  }

  const results: DigestAgencyResult[] = [];

  for (const agency of agencies ?? []) {
    const { data: managers, error: managersError } = await admin
      .from("agency_members")
      .select("email, role, joined_at")
      .eq("agency_id", agency.id)
      .not("joined_at", "is", null)
      .in("role", ["manager", "agency_owner", "super_admin"]);

    if (managersError) {
      results.push({
        agencyId: agency.id,
        agencyName: agency.name,
        agencySlug: agency.slug,
        recipients: [],
        emailed: false,
        skipped: true,
        error: managersError.message,
      });
      continue;
    }

    const recipients = Array.from(
      new Set((managers ?? []).map((m) => m.email).filter(Boolean)),
    );

    if (recipients.length === 0) {
      results.push({
        agencyId: agency.id,
        agencyName: agency.name,
        agencySlug: agency.slug,
        recipients: [],
        emailed: false,
        skipped: true,
      });
      continue;
    }

    const { data: events, error: eventsError } = await admin
      .from("activity_events")
      .select("event_type, payload, agent_id")
      .eq("agency_id", agency.id)
      .gte("created_at", bounds.startIso)
      .lte("created_at", bounds.endIso);

    if (eventsError) {
      results.push({
        agencyId: agency.id,
        agencyName: agency.name,
        agencySlug: agency.slug,
        recipients,
        emailed: false,
        skipped: true,
        error: eventsError.message,
      });
      continue;
    }

    let messages = 0;
    let leads = 0;
    let closings = 0;
    let followups = 0;
    const activeAgents = new Set<string>();

    for (const event of events ?? []) {
      activeAgents.add(event.agent_id);
      if (event.event_type === "outreach_logged") {
        messages += outreachCount(event.payload);
      } else if (event.event_type === "lead_created") {
        leads += 1;
      } else if (event.event_type === "lead_status_changed") {
        const payload =
          event.payload &&
          typeof event.payload === "object" &&
          !Array.isArray(event.payload)
            ? (event.payload as Record<string, unknown>)
            : {};
        if (payload.to === "closed_won") closings += 1;
      } else if (event.event_type === "followup_completed") {
        followups += 1;
      }
    }

    const managerUrl = `${appUrl()}/a/${agency.slug}/manager`;
    const html = `
      <h2>${escapeHtml(agency.name)} — daily digest</h2>
      <p>Activity for <strong>${escapeHtml(bounds.dayLabel)}</strong> (Dubai).</p>
      <ul>
        <li>Messages / outreach: <strong>${messages}</strong></li>
        <li>Leads created: <strong>${leads}</strong></li>
        <li>Deals closed: <strong>${closings}</strong></li>
        <li>Follow-ups completed: <strong>${followups}</strong></li>
        <li>Active agents: <strong>${activeAgents.size}</strong></li>
      </ul>
      <p><a href="${escapeHtml(managerUrl)}">Open manager dashboard</a></p>
    `;

    const sendResult = await sendEmail({
      to: recipients,
      subject: `[TeamOS] ${agency.name} daily digest · ${bounds.dayLabel}`,
      html,
    });

    results.push({
      agencyId: agency.id,
      agencyName: agency.name,
      agencySlug: agency.slug,
      recipients,
      emailed: sendResult.ok && sendResult.emailed,
      skipped: !sendResult.ok ? false : !sendResult.emailed,
      error: sendResult.ok ? undefined : sendResult.error,
    });
  }

  return { dayLabel: bounds.dayLabel, results };
}

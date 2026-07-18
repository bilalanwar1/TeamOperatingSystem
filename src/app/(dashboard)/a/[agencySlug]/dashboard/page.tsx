import Link from "next/link";
import { redirect } from "next/navigation";

import { FollowupsPanel } from "@/components/followups/followups-panel";
import { OutreachLoggerForm } from "@/components/outreach/outreach-logger-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasRole } from "@/lib/auth/roles";
import { getTodayOutreachTotalsForCurrentAgent } from "@/lib/services/activity";
import { listFollowupsForCurrentAgent } from "@/lib/services/followups";
import { requireMembership } from "@/lib/services/membership";
import {
  OUTREACH_CHANNELS,
  type OutreachChannel,
  type OutreachLoggedPayload,
} from "@/types/activity";
import type { Json } from "@/types/database";

type DashboardPageProps = {
  params: Promise<{ agencySlug: string }>;
};

const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  email: "Email",
  calls: "Calls",
};

function readPayload(payload: Json): OutreachLoggedPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const obj = payload as Record<string, unknown>;
  if (typeof obj.channel !== "string" || typeof obj.count !== "number") {
    return null;
  }
  return obj as unknown as OutreachLoggedPayload;
}

export default async function AgentDashboardPage({ params }: DashboardPageProps) {
  const { agencySlug } = await params;
  const membership = await requireMembership(agencySlug, "agent");

  if (!membership.ok) {
    if (membership.status === 401) {
      redirect(`/login?next=/a/${agencySlug}/dashboard`);
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">{membership.error}</p>
        <Link href="/account" className="text-sm underline">
          Account
        </Link>
      </main>
    );
  }

  const [today, followups] = await Promise.all([
    getTodayOutreachTotalsForCurrentAgent(agencySlug),
    listFollowupsForCurrentAgent(agencySlug),
  ]);

  if (!today.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Could not load dashboard</h1>
        <p className="text-muted-foreground">{today.error}</p>
      </main>
    );
  }

  const { agency, role, member } = membership.context;
  const canManageTeam = hasRole(role, "manager");
  const followupCount = followups.ok
    ? followups.dueToday.length + followups.overdue.length
    : 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{agency.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Agent dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            {member.full_name || member.email} · today (Dubai) {today.dayLabel}
            {followupCount > 0 ? ` · ${followupCount} follow-up(s)` : ""}
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/a/${agency.slug}/leads`}
            className="underline underline-offset-4"
          >
            Leads
          </Link>
          <Link
            href={`/a/${agency.slug}/leaderboard`}
            className="underline underline-offset-4"
          >
            Leaderboard
          </Link>
          <Link
            href={`/a/${agency.slug}/reports`}
            className="underline underline-offset-4"
          >
            Reports
          </Link>
          {canManageTeam ? (
            <>
              <Link
                href={`/a/${agency.slug}/manager`}
                className="underline underline-offset-4"
              >
                Manager
              </Link>
              <Link
                href={`/a/${agency.slug}/team`}
                className="underline underline-offset-4"
              >
                Team
              </Link>
            </>
          ) : null}
          <Link href={`/a/${agency.slug}`} className="underline underline-offset-4">
            Agency
          </Link>
          <Link href="/account" className="underline underline-offset-4">
            Account
          </Link>
        </nav>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Follow-ups</CardTitle>
          <CardDescription>
            Due today and overdue tasks on your leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {followups.ok ? (
            <FollowupsPanel
              agencySlug={agency.slug}
              dayLabel={followups.dayLabel}
              dueToday={followups.dueToday}
              overdue={followups.overdue}
            />
          ) : (
            <p className="text-sm text-destructive">{followups.error}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s totals</CardTitle>
          <CardDescription>
            Sum of outreach logged today · {today.totals.total} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {OUTREACH_CHANNELS.map((channel) => (
              <li
                key={channel}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <p className="text-muted-foreground">{CHANNEL_LABELS[channel]}</p>
                <p className="text-xl font-semibold tabular-nums">
                  {today.totals[channel]}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <OutreachLoggerForm agencySlug={agency.slug} />

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s log</CardTitle>
          <CardDescription>Most recent entries first.</CardDescription>
        </CardHeader>
        <CardContent>
          {today.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No outreach logged yet today.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {today.recent.map((event) => {
                const payload = readPayload(event.payload);
                if (!payload) return null;
                const time = new Intl.DateTimeFormat("en-GB", {
                  timeZone: "Asia/Dubai",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(event.created_at));
                return (
                  <li
                    key={event.id}
                    className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">
                        {CHANNEL_LABELS[payload.channel as OutreachChannel] ??
                          payload.channel}{" "}
                        · {payload.count}
                      </p>
                      {payload.notes ? (
                        <p className="text-muted-foreground">{payload.notes}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-muted-foreground">{time}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

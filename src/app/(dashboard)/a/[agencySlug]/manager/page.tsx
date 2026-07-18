import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AgentOutreachChart,
  TeamOutreachChart,
} from "@/components/manager/performance-charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getManagerDashboard } from "@/lib/services/manager";

type ManagerPageProps = {
  params: Promise<{ agencySlug: string }>;
};

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function ManagerDashboardPage({ params }: ManagerPageProps) {
  const { agencySlug } = await params;
  const result = await getManagerDashboard(agencySlug);

  if (!result.ok) {
    if (result.status === 401) {
      redirect(`/login?next=/a/${agencySlug}/manager`);
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">{result.error}</p>
        <Link href={`/a/${agencySlug}`} className="text-sm underline">
          Back to agency
        </Link>
      </main>
    );
  }

  const { data } = result;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Manager overview</p>
          <h1 className="text-2xl font-semibold tracking-tight">Team dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Today {data.dayLabel} · Week {data.weekLabel} (Dubai)
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/a/${agencySlug}/leads`}
            className="underline underline-offset-4"
          >
            Leads
          </Link>
          <Link
            href={`/a/${agencySlug}/leaderboard`}
            className="underline underline-offset-4"
          >
            Leaderboard
          </Link>
          <Link
            href={`/a/${agencySlug}/reports`}
            className="underline underline-offset-4"
          >
            Reports
          </Link>
          <Link
            href={`/a/${agencySlug}/insights`}
            className="underline underline-offset-4"
          >
            Insights
          </Link>
          <Link
            href={`/a/${agencySlug}/ai`}
            className="underline underline-offset-4"
          >
            AI
          </Link>
          <Link
            href={`/a/${agencySlug}/team`}
            className="underline underline-offset-4"
          >
            Team
          </Link>

          <Link
            href={`/a/${agencySlug}/dashboard`}
            className="underline underline-offset-4"
          >
            My dashboard
          </Link>
          <Link href={`/a/${agencySlug}`} className="underline underline-offset-4">
            Agency
          </Link>
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team outreach today</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.teamOutreachToday}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team outreach (7 days)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.teamOutreachWeek}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outreach last 7 days</CardTitle>
            <CardDescription>Agency-wide daily totals</CardDescription>
          </CardHeader>
          <CardContent>
            <TeamOutreachChart data={data.dailyOutreach} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Per-agent outreach</CardTitle>
            <CardDescription>Today vs this week</CardDescription>
          </CardHeader>
          <CardContent>
            <AgentOutreachChart agents={data.agents} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent performance</CardTitle>
          <CardDescription>Today and rolling 7-day window</CardDescription>
        </CardHeader>
        <CardContent>
          {data.agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {data.agents.map((agent) => (
                <li
                  key={agent.agentId}
                  className="grid gap-1 rounded-lg border px-3 py-2 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-muted-foreground">
                      {agent.role} · {agent.email}
                    </p>
                  </div>
                  <div className="text-muted-foreground sm:text-right">
                    <p>
                      Outreach {agent.outreachToday} today / {agent.outreachWeek} week
                    </p>
                    <p>
                      Leads {agent.leadsCreatedToday} today / {agent.leadsCreatedWeek}{" "}
                      week · Won {agent.closedWonWeek}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live activity</CardTitle>
          <CardDescription>
            Latest events from activity_events (this week)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity this week yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {data.feed.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{item.summary}</p>
                    <p className="text-muted-foreground">{item.agentName}</p>
                  </div>
                  <span className="shrink-0 text-muted-foreground">
                    {formatTime(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getLeaderboard,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from "@/lib/services/leaderboard";
import { hasRole } from "@/lib/auth/roles";
import { requireMembership } from "@/lib/services/membership";

type LeaderboardPageProps = {
  params: Promise<{ agencySlug: string }>;
  searchParams: Promise<{ period?: string; by?: string }>;
};

function parsePeriod(value?: string): LeaderboardPeriod {
  return value === "month" ? "month" : "week";
}

function parseMetric(value?: string): LeaderboardMetric {
  if (value === "leads" || value === "closings") return value;
  return "messages";
}

const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  messages: "Messages sent",
  leads: "Leads created",
  closings: "Deals closed",
};

function metricValue(
  entry: { messages: number; leads: number; closings: number },
  metric: LeaderboardMetric,
): number {
  if (metric === "messages") return entry.messages;
  if (metric === "leads") return entry.leads;
  return entry.closings;
}

export default async function LeaderboardPage({
  params,
  searchParams,
}: LeaderboardPageProps) {
  const { agencySlug } = await params;
  const query = await searchParams;
  const period = parsePeriod(query.period);
  const rankedBy = parseMetric(query.by);

  const membership = await requireMembership(agencySlug, "agent");
  if (!membership.ok) {
    if (membership.status === 401) {
      redirect(`/login?next=/a/${agencySlug}/leaderboard`);
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">{membership.error}</p>
      </main>
    );
  }

  const result = await getLeaderboard({ agencySlug, period, rankedBy });
  if (!result.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Could not load leaderboard</h1>
        <p className="text-muted-foreground">{result.error}</p>
      </main>
    );
  }

  const { data } = result;
  const { agency, role } = membership.context;
  const canManage = hasRole(role, "manager");
  const base = `/a/${agency.slug}/leaderboard`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{agency.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
          <p className="mt-1 text-muted-foreground">{data.periodLabel}</p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/a/${agency.slug}/dashboard`}
            className="underline underline-offset-4"
          >
            Dashboard
          </Link>
          <Link
            href={`/a/${agency.slug}/reports`}
            className="underline underline-offset-4"
          >
            Reports
          </Link>
          {canManage ? (
            <Link
              href={`/a/${agency.slug}/manager`}
              className="underline underline-offset-4"
            >
              Manager
            </Link>
          ) : null}
          <Link href={`/a/${agency.slug}`} className="underline underline-offset-4">
            Agency
          </Link>
        </nav>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["week", "month"] as const).map((p) => (
          <Link
            key={p}
            href={`${base}?period=${p}&by=${rankedBy}`}
            className={
              period === p
                ? "rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground"
                : "rounded-lg border px-3 py-1.5 hover:bg-muted"
            }
          >
            {p === "week" ? "This week" : "This month"}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["messages", "leads", "closings"] as const).map((metric) => (
          <Link
            key={metric}
            href={`${base}?period=${period}&by=${metric}`}
            className={
              rankedBy === metric
                ? "rounded-lg bg-secondary px-3 py-1.5 font-medium"
                : "rounded-lg border px-3 py-1.5 hover:bg-muted"
            }
          >
            {METRIC_LABELS[metric]}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranked by {METRIC_LABELS[rankedBy].toLowerCase()}</CardTitle>
          <CardDescription>
            Sourced only from activity_events — no separate score tables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agents on the roster yet.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {data.entries.map((entry) => (
                <li
                  key={entry.agentId}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                    entry.isCurrentUser ? "border-primary/40 bg-muted/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center text-lg font-semibold tabular-nums text-muted-foreground">
                      {entry.rank}
                    </span>
                    <div>
                      <p className="font-medium">
                        {entry.name}
                        {entry.isCurrentUser ? " (you)" : ""}
                      </p>
                      <p className="text-muted-foreground">
                        {entry.messages} msgs · {entry.leads} leads ·{" "}
                        {entry.closings} closed
                      </p>
                    </div>
                  </div>
                  <span className="text-xl font-semibold tabular-nums">
                    {metricValue(entry, rankedBy)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { ExportReportsCsvButton } from "@/components/reports/export-csv-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasRole } from "@/lib/auth/roles";
import { requireMembership } from "@/lib/services/membership";
import {
  getAgencyReports,
  type ReportPeriod,
} from "@/lib/services/reports";

type ReportsPageProps = {
  params: Promise<{ agencySlug: string }>;
  searchParams: Promise<{ period?: string }>;
};

function parsePeriod(value?: string): ReportPeriod {
  return value === "weekly" ? "weekly" : "daily";
}

export default async function ReportsPage({
  params,
  searchParams,
}: ReportsPageProps) {
  const { agencySlug } = await params;
  const query = await searchParams;
  const period = parsePeriod(query.period);

  const membership = await requireMembership(agencySlug, "agent");
  if (!membership.ok) {
    if (membership.status === 401) {
      redirect(`/login?next=/a/${agencySlug}/reports`);
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">{membership.error}</p>
      </main>
    );
  }

  const result = await getAgencyReports({ agencySlug, period });
  if (!result.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Could not load reports</h1>
        <p className="text-muted-foreground">{result.error}</p>
      </main>
    );
  }

  const { data } = result;
  const { agency, role } = membership.context;
  const canManage = hasRole(role, "manager");
  const base = `/a/${agency.slug}/reports`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{agency.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-muted-foreground">{data.periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportReportsCsvButton data={data} />
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link
              href={`/a/${agency.slug}/leaderboard`}
              className="underline underline-offset-4"
            >
              Leaderboard
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
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(["daily", "weekly"] as const).map((p) => (
          <Link
            key={p}
            href={`${base}?period=${p}`}
            className={
              period === p
                ? "rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground"
                : "rounded-lg border px-3 py-1.5 hover:bg-muted"
            }
          >
            {p === "daily" ? "Daily" : "Weekly"}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Agency messages</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.agency.messages}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Leads created</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.agency.leadsCreated}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active agents</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.agency.activeAgents}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agency summary</CardTitle>
          <CardDescription>
            Roll-up for the selected period · closings {data.agency.closings} ·
            status changes {data.agency.statusChanges} · follow-ups{" "}
            {data.agency.followups}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-agent summary</CardTitle>
          <CardDescription>
            Export includes agency + agent rows as CSV (browser download only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agents on the roster.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Agent</th>
                    <th className="px-2 py-2 font-medium">Msgs</th>
                    <th className="px-2 py-2 font-medium">Leads</th>
                    <th className="px-2 py-2 font-medium">Status Δ</th>
                    <th className="px-2 py-2 font-medium">Closed</th>
                    <th className="px-2 py-2 font-medium">Follow-ups</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agents.map((agent) => (
                    <tr key={agent.agentId} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-muted-foreground">{agent.role}</p>
                      </td>
                      <td className="px-2 py-2 tabular-nums">{agent.messages}</td>
                      <td className="px-2 py-2 tabular-nums">
                        {agent.leadsCreated}
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {agent.statusChanges}
                      </td>
                      <td className="px-2 py-2 tabular-nums">{agent.closings}</td>
                      <td className="px-2 py-2 tabular-nums">{agent.followups}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

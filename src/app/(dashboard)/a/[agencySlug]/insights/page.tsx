import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ConversionBySourceChart,
  TrendsLineChart,
} from "@/components/insights/insight-charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAgencyInsights } from "@/lib/services/insights";

type InsightsPageProps = {
  params: Promise<{ agencySlug: string }>;
};

export default async function InsightsPage({ params }: InsightsPageProps) {
  const { agencySlug } = await params;
  const result = await getAgencyInsights(agencySlug);

  if (!result.ok) {
    if (result.status === 401) {
      redirect(`/login?next=/a/${agencySlug}/insights`);
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">{result.error}</p>
        <Link href={`/a/${agencySlug}`} className="text-sm underline">
          Back
        </Link>
      </main>
    );
  }

  const { data } = result;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-10 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Insights</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Trends & conversion
          </h1>
          <p className="mt-1 text-muted-foreground">{data.rangeLabel}</p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/a/${agencySlug}/manager`}
            className="underline underline-offset-4"
          >
            Manager
          </Link>
          <Link
            href={`/a/${agencySlug}/reports`}
            className="underline underline-offset-4"
          >
            Reports
          </Link>
          <Link href={`/a/${agencySlug}`} className="underline underline-offset-4">
            Agency
          </Link>
        </nav>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Leads created</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.totals.leadsCreated}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Closed won</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.totals.closedWon}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall conversion</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.totals.overallConversionRate}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>14-day trends</CardTitle>
          <CardDescription>Messages, leads, and closings per day</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendsLineChart data={data.trends} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversion by lead source</CardTitle>
          <CardDescription>
            Closed won ÷ leads created in this window (by source)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ConversionBySourceChart data={data.sources} />
          {data.sources.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Source</th>
                    <th className="px-2 py-2 font-medium">Created</th>
                    <th className="px-2 py-2 font-medium">Closed</th>
                    <th className="px-2 py-2 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.map((row) => (
                    <tr key={row.source} className="border-b last:border-0">
                      <td className="px-2 py-2 font-medium">{row.label}</td>
                      <td className="px-2 py-2 tabular-nums">{row.created}</td>
                      <td className="px-2 py-2 tabular-nums">{row.closedWon}</td>
                      <td className="px-2 py-2 tabular-nums">
                        {row.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

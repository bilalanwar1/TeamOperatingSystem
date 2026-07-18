import Link from "next/link";
import { redirect } from "next/navigation";

import { RefreshLeadScoresButton } from "@/components/ai/refresh-scores-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getLatestLeadScores,
  getRecentSlippingInsights,
} from "@/lib/services/ai-scoring";
import { getFeatureFlag } from "@/lib/services/feature-flags";
import { listLeads } from "@/lib/services/leads";
import { requireMembership } from "@/lib/services/membership";

type AiPageProps = {
  params: Promise<{ agencySlug: string }>;
};

export default async function AiInsightsPage({ params }: AiPageProps) {
  const { agencySlug } = await params;
  const membership = await requireMembership(agencySlug, "manager");

  if (!membership.ok) {
    if (membership.status === 401) {
      redirect(`/login?next=/a/${agencySlug}/ai`);
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">{membership.error}</p>
        <Link href={`/a/${agencySlug}`} className="text-sm underline">
          Back
        </Link>
      </main>
    );
  }

  const enabled = await getFeatureFlag(agencySlug, "ai_insights");
  const agencyId = membership.context.agency.id;

  if (!enabled) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
        <div>
          <p className="text-sm text-muted-foreground">AI module</p>
          <h1 className="text-2xl font-semibold">AI insights</h1>
          <p className="mt-2 text-muted-foreground">
            This pilot feature is off. Enable{" "}
            <strong>AI insights</strong> on the Team page for this agency.
          </p>
        </div>
        <Link
          href={`/a/${agencySlug}/team`}
          className="text-sm underline underline-offset-4"
        >
          Open Team settings
        </Link>
      </main>
    );
  }

  const [scores, slipping, listed] = await Promise.all([
    getLatestLeadScores(agencyId),
    getRecentSlippingInsights(agencyId),
    listLeads(agencySlug),
  ]);

  const scoredLeads =
    listed.ok
      ? listed.leads
          .map((lead) => {
            const insight = scores.get(lead.id);
            return insight
              ? { lead, score: insight.score, reasons: insight.reasons }
              : null;
          })
          .filter(
            (
              row,
            ): row is {
              lead: (typeof listed.leads)[number];
              score: number;
              reasons: string[];
            } => row !== null,
          )
          .sort((a, b) => b.score - a.score)
      : [];

  // Deduplicate slipping by agent (latest first already)
  const seenAgents = new Set<string>();
  const latestSlipping = slipping.filter((row) => {
    const key = row.agentId ?? row.name;
    if (seenAgents.has(key)) return false;
    seenAgents.add(key);
    return true;
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10 sm:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">AI module</p>
          <h1 className="text-2xl font-semibold tracking-tight">AI insights</h1>
          <p className="mt-1 text-muted-foreground">
            Heuristic lead scores and weekly activity drop alerts.
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/a/${agencySlug}/manager`}
            className="underline underline-offset-4"
          >
            Manager
          </Link>
          <Link
            href={`/a/${agencySlug}/insights`}
            className="underline underline-offset-4"
          >
            Trends
          </Link>
          <Link
            href={`/a/${agencySlug}/leads`}
            className="underline underline-offset-4"
          >
            Leads
          </Link>
          <Link href={`/a/${agencySlug}`} className="underline underline-offset-4">
            Agency
          </Link>
        </nav>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead scores</CardTitle>
          <CardDescription>
            Nightly cron + manual refresh. Higher = hotter open leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RefreshLeadScoresButton agencySlug={agencySlug} />
          {scoredLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scores yet. Refresh above or wait for the nightly job.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {scoredLeads.slice(0, 25).map(({ lead, score, reasons }) => (
                <li key={lead.id}>
                  <Link
                    href={`/a/${agencySlug}/leads/${lead.id}`}
                    className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-muted-foreground">
                        {reasons.slice(0, 2).join(" · ") || lead.status}
                      </p>
                    </div>
                    <span className="text-lg font-semibold tabular-nums">
                      {score}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agents slipping</CardTitle>
          <CardDescription>
            40%+ outreach drop vs prior week (baseline ≥ 10 messages). Emails
            managers Mondays via cron.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestSlipping.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No slipping alerts stored yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {latestSlipping.map((row) => (
                <li
                  key={`${row.agentId}-${row.createdAt}`}
                  className="flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-muted-foreground">
                      {row.thisWeek} this week · {row.lastWeek} last week
                    </p>
                  </div>
                  <span className="font-medium text-destructive tabular-nums">
                    −{row.dropPercent}%
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

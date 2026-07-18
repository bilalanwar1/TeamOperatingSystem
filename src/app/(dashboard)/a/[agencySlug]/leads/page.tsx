import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasRole } from "@/lib/auth/roles";
import { getLatestLeadScores } from "@/lib/services/ai-scoring";
import { getFeatureFlag } from "@/lib/services/feature-flags";
import { listLeads } from "@/lib/services/leads";
import { requireMembership } from "@/lib/services/membership";
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
} from "@/types/leads";

type LeadsPageProps = {
  params: Promise<{ agencySlug: string }>;
};

export default async function LeadsPage({ params }: LeadsPageProps) {
  const { agencySlug } = await params;
  const membership = await requireMembership(agencySlug, "agent");

  if (!membership.ok) {
    if (membership.status === 401) {
      redirect(`/login?next=/a/${agencySlug}/leads`);
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">{membership.error}</p>
      </main>
    );
  }

  const listed = await listLeads(agencySlug);
  if (!listed.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Could not load leads</h1>
        <p className="text-muted-foreground">{listed.error}</p>
      </main>
    );
  }

  const { agency, role } = membership.context;
  const canManageTeam = hasRole(role, "manager");
  const aiEnabled = await getFeatureFlag(agencySlug, "ai_insights");
  const scores = aiEnabled
    ? await getLatestLeadScores(agency.id)
    : new Map();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{agency.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-muted-foreground">
            {listed.leads.length} lead{listed.leads.length === 1 ? "" : "s"}
            {canManageTeam ? " (agency-wide)" : " (yours)"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href={`/a/${agency.slug}/leads/new`}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 font-medium text-primary-foreground hover:bg-primary/80"
          >
            New lead
          </Link>
          <Link
            href={`/a/${agency.slug}/dashboard`}
            className="underline underline-offset-4"
          >
            Dashboard
          </Link>
          <Link href={`/a/${agency.slug}`} className="underline underline-offset-4">
            Agency
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All leads</CardTitle>
          <CardDescription>
            Agents see their own leads; managers see everyone&apos;s.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listed.leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads yet. Create your first one.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {listed.leads.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/a/${agency.slug}/leads/${lead.id}`}
                    className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-muted-foreground">
                        {LEAD_STATUS_LABELS[lead.status]} ·{" "}
                        {LEAD_SOURCE_LABELS[lead.source]}
                        {lead.phone ? ` · ${lead.phone}` : ""}
                        {scores.get(lead.id)
                          ? ` · Score ${scores.get(lead.id)!.score}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-muted-foreground">
                      {lead.follow_up_date
                        ? `Follow-up ${lead.follow_up_date}`
                        : "No follow-up"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

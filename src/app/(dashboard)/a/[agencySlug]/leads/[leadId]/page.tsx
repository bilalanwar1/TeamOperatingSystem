import Link from "next/link";
import { redirect } from "next/navigation";

import { LeadForm } from "@/components/leads/lead-form";
import { getLead } from "@/lib/services/leads";
import { requireMembership } from "@/lib/services/membership";

type EditLeadPageProps = {
  params: Promise<{ agencySlug: string; leadId: string }>;
};

export default async function EditLeadPage({ params }: EditLeadPageProps) {
  const { agencySlug, leadId } = await params;
  const membership = await requireMembership(agencySlug, "agent");

  if (!membership.ok) {
    if (membership.status === 401) {
      redirect(`/login?next=/a/${agencySlug}/leads/${leadId}`);
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">{membership.error}</p>
      </main>
    );
  }

  const leadResult = await getLead(agencySlug, leadId);
  if (!leadResult.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Lead not found</h1>
        <p className="text-muted-foreground">{leadResult.error}</p>
        <Link href={`/a/${agencySlug}/leads`} className="text-sm underline">
          Back to leads
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          {membership.context.agency.name}
        </p>
        <h1 className="text-2xl font-semibold">{leadResult.lead.name}</h1>
      </div>
      <LeadForm agencySlug={agencySlug} lead={leadResult.lead} />
      <Link
        href={`/a/${agencySlug}/leads`}
        className="text-sm underline underline-offset-4"
      >
        Back to leads
      </Link>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { LeadForm } from "@/components/leads/lead-form";
import { requireMembership } from "@/lib/services/membership";

type NewLeadPageProps = {
  params: Promise<{ agencySlug: string }>;
};

export default async function NewLeadPage({ params }: NewLeadPageProps) {
  const { agencySlug } = await params;
  const membership = await requireMembership(agencySlug, "agent");

  if (!membership.ok) {
    if (membership.status === 401) {
      redirect(`/login?next=/a/${agencySlug}/leads/new`);
    }
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">{membership.error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          {membership.context.agency.name}
        </p>
        <h1 className="text-2xl font-semibold">New lead</h1>
      </div>
      <LeadForm agencySlug={agencySlug} />
      <Link
        href={`/a/${agencySlug}/leads`}
        className="text-sm underline underline-offset-4"
      >
        Back to leads
      </Link>
    </main>
  );
}

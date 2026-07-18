import Link from "next/link";
import { redirect } from "next/navigation";

import { requireMembership } from "@/lib/services/membership";

type AgencyHomeProps = {
  params: Promise<{ agencySlug: string }>;
};

export default async function AgencyHomePage({ params }: AgencyHomeProps) {
  const { agencySlug } = await params;
  const membership = await requireMembership(agencySlug, "agent");

  if (!membership.ok) {
    if (membership.status === 401) {
      redirect(`/login?next=/a/${agencySlug}`);
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="max-w-md text-center text-muted-foreground">
          {membership.error}
        </p>
        <Link href="/account" className="text-sm underline underline-offset-4">
          Back to account
        </Link>
      </main>
    );
  }

  const { agency, role, member } = membership.context;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-6 py-12">
      <p className="text-sm text-muted-foreground">Agency workspace</p>
      <h1 className="text-2xl font-semibold">{agency.name}</h1>
      <p className="text-muted-foreground">
        Signed in as {member.email} · role: {role}
      </p>
      <p className="text-sm text-muted-foreground">
        Path: /a/{agency.slug}. Agent dashboard and outreach land in later modules.
      </p>
      <Link href="/account" className="text-sm underline underline-offset-4">
        Account
      </Link>
    </main>
  );
}

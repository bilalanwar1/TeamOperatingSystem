import Link from "next/link";

import { JoinAgencyForm } from "@/components/agency/join-agency-form";
import { getCurrentUser } from "@/lib/services/auth";
import { getInviteByToken } from "@/lib/services/invites";

type JoinPageProps = {
  params: Promise<{ agencySlug: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function JoinAgencyPage({
  params,
  searchParams,
}: JoinPageProps) {
  const { agencySlug } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Missing invite</h1>
        <p className="text-muted-foreground">
          Open the full invite link from your email.
        </p>
        <Link href="/login" className="text-sm underline">
          Sign in
        </Link>
      </main>
    );
  }

  const preview = await getInviteByToken(token);
  if (!preview.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Invalid invite</h1>
        <p className="text-muted-foreground">{preview.error}</p>
      </main>
    );
  }

  if (preview.invite.agencySlug !== agencySlug) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Invite mismatch</h1>
        <p className="text-muted-foreground">
          This token does not belong to /a/{agencySlug}.
        </p>
      </main>
    );
  }

  if (preview.invite.acceptedAt) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Already accepted</h1>
        <Link
          href={`/a/${agencySlug}`}
          className="text-sm underline underline-offset-4"
        >
          Go to agency
        </Link>
      </main>
    );
  }

  if (new Date(preview.invite.expiresAt) < new Date()) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6">
        <h1 className="text-2xl font-semibold">Invite expired</h1>
        <p className="text-muted-foreground">
          Ask a manager to send a new invite.
        </p>
      </main>
    );
  }

  const user = await getCurrentUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          TeamOS
        </p>
      </div>
      <JoinAgencyForm
        token={token}
        invite={preview.invite}
        signedInEmail={user?.email}
      />
    </main>
  );
}

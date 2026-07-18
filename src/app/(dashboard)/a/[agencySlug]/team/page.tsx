import Link from "next/link";
import { redirect } from "next/navigation";

import { AiInsightsToggle } from "@/components/agency/ai-insights-toggle";
import { InviteTeammateForm } from "@/components/agency/invite-teammate-form";
import {
  WhatsappModuleToggle,
  WhatsappPhoneRoster,
} from "@/components/agency/whatsapp-settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasRole } from "@/lib/auth/roles";
import { getFeatureFlag } from "@/lib/services/feature-flags";
import { listAgencyInvites } from "@/lib/services/invites";
import { requireMembership } from "@/lib/services/membership";
import { listAgencyRoster } from "@/lib/services/team";

type TeamPageProps = {
  params: Promise<{ agencySlug: string }>;
};

export default async function TeamPage({ params }: TeamPageProps) {
  const { agencySlug } = await params;
  const membership = await requireMembership(agencySlug, "manager");

  if (!membership.ok) {
    if (membership.status === 401) {
      redirect(`/login?next=/a/${agencySlug}/team`);
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

  const [invites, roster, whatsappEnabled, aiEnabled] = await Promise.all([
    listAgencyInvites(agencySlug),
    listAgencyRoster(agencySlug),
    getFeatureFlag(agencySlug, "whatsapp_module"),
    getFeatureFlag(agencySlug, "ai_insights"),
  ]);

  const canInvite = hasRole(membership.context.role, "manager");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
      <div>
        <p className="text-sm text-muted-foreground">
          {membership.context.agency.name}
        </p>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="mt-1 text-muted-foreground">
          Invites, WhatsApp pilot, AI insights, and roster phones.
        </p>
      </div>

      {canInvite ? <InviteTeammateForm agencySlug={agencySlug} /> : null}

      <WhatsappModuleToggle
        agencySlug={agencySlug}
        enabled={whatsappEnabled}
      />

      <AiInsightsToggle agencySlug={agencySlug} enabled={aiEnabled} />

      {roster.ok ? (
        <WhatsappPhoneRoster agencySlug={agencySlug} members={roster.members} />
      ) : (
        <p className="text-sm text-destructive">{roster.error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending & recent invites</CardTitle>
          <CardDescription>Invites expire after 7 days.</CardDescription>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invites yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-muted-foreground">
                      {invite.role}
                      {invite.accepted_at
                        ? " · accepted"
                        : new Date(invite.expires_at) < new Date()
                          ? " · expired"
                          : " · pending"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Link href={`/a/${agencySlug}`} className="text-sm underline underline-offset-4">
        Back to agency
      </Link>
    </main>
  );
}

type AgencyHomeProps = {
  params: Promise<{ agencySlug: string }>;
};

export default async function AgencyHomePage({ params }: AgencyHomeProps) {
  const { agencySlug } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 px-6">
      <p className="text-sm text-muted-foreground">Agency workspace</p>
      <h1 className="text-2xl font-semibold">/a/{agencySlug}</h1>
      <p className="max-w-md text-center text-muted-foreground">
        Path-based multi-tenancy shell. Auth, onboarding, and dashboards land in
        Phase 1.
      </p>
    </main>
  );
}

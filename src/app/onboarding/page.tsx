import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateAgencyForm } from "@/components/agency/create-agency-form";
import { requireUser } from "@/lib/services/auth";

export default async function OnboardingPage() {
  const auth = await requireUser();
  if (!auth.ok) {
    redirect("/login?next=/onboarding");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          TeamOS
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Agency onboarding</h1>
      </div>
      <CreateAgencyForm />
      <Link href="/account" className="text-sm underline underline-offset-4">
        Back to account
      </Link>
    </main>
  );
}

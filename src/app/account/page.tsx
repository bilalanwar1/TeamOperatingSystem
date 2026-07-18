import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/services/auth";
import { listJoinedAgencies } from "@/lib/services/membership";

export default async function AccountPage() {
  const auth = await requireUser();
  if (!auth.ok) {
    redirect("/login");
  }

  const agencies = await listJoinedAgencies();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Signed in</p>
          <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
          <p className="mt-1 text-muted-foreground">{auth.user.email}</p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your agencies</CardTitle>
          <CardDescription>
            Multi-tenant access is gated by membership and RLS. Creating an
            agency lands in Module 2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No agencies yet. After Module 2 onboarding, your workspaces will
              appear here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {agencies.map(({ agency, role }) => (
                <li key={agency.id}>
                  <Link
                    href={`/a/${agency.slug}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{agency.name}</span>
                    <span className="text-muted-foreground">{role}</span>
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

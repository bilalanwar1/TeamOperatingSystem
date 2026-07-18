import Link from "next/link";

import { getCurrentUser } from "@/lib/services/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          Real Estate TeamOS
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Team operating system
        </h1>
        <p className="mt-3 text-muted-foreground">
          Activity-first workspace for UAE real estate teams. Module 1: auth and
          multi-tenant access.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {user ? (
          <Link
            href="/account"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Go to account
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
            >
              Create account
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

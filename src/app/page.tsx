import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          Real Estate TeamOS
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Phase 0 ready
        </h1>
        <p className="mt-3 text-muted-foreground">
          Next.js, shadcn/ui, Supabase clients, spine schema, and extensible
          service folders are in place. Next: Module 1 — Auth + multi-tenancy.
        </p>
      </div>
      <Link
        href="/a/demo"
        className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        Tenant route placeholder
      </Link>
    </main>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10 sm:px-6 sm:py-12">
      <div className="text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          TeamOS
        </p>
      </div>
      {children}
    </main>
  );
}

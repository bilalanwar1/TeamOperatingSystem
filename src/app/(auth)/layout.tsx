export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">
          TeamOS
        </p>
      </div>
      {children}
    </main>
  );
}

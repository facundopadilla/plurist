export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md px-8 py-10 border border-border rounded-lg bg-card">
        <div className="mb-6 text-center font-semibold text-xl tracking-tight">
          Socialclaw
        </div>
        {children}
      </div>
    </div>
  );
}

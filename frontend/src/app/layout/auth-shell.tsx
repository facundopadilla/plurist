const workspaceLanes = [
  { label: "Projects", value: "Campaign structure, briefs, and shared assets" },
  { label: "Reviews", value: "Approval flow with role-aware decisions" },
  { label: "Publishing", value: "Queue visibility and network-ready delivery" },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex w-full flex-col overflow-hidden rounded-[24px] border border-border bg-card shadow-sm lg:flex-row">
          <section className="flex flex-1 flex-col justify-between border-b border-border bg-gradient-to-br from-card to-muted/50 px-6 py-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
            <div className="space-y-10">
              <div className="space-y-4 border-b border-border pb-5">
                <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="paper-kicker text-inherit">Socialclaw</span>
                  <span className="font-elegant-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Elegant UI
                  </span>
                </div>
                <div className="space-y-3">
                  <h2 className="max-w-lg text-[32px] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground">
                    A calmer way into the workspace.
                  </h2>
                  <p className="max-w-md text-[16px] leading-7 text-muted-foreground">
                    Sign in to review active work, move content through
                    approvals, and publish with a clearer sense of what needs
                    attention.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {workspaceLanes.map((lane) => (
                  <div
                    key={lane.label}
                    className="grid grid-cols-[112px_1fr] gap-4 border-b border-border/80 py-3 last:border-b-0"
                  >
                    <div className="font-elegant-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
                      {lane.label}
                    </div>
                    <div className="text-[16px] leading-7 text-foreground/80">
                      {lane.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="font-elegant-mono mt-10 border-t border-border pt-4 text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              Invite-only onboarding · Session auth · Google sign-in
            </div>
          </section>

          <section className="flex w-full items-center bg-card px-6 py-8 sm:px-8 lg:w-[480px] lg:flex-shrink-0 lg:px-10 lg:py-10">
            <div className="mx-auto w-full max-w-md">{children}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

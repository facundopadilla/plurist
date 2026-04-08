interface OIDCProvidersProps {
  googleLinked: boolean;
  googleEmail?: string;
}

export function OIDCProviders({
  googleLinked,
  googleEmail,
}: Readonly<OIDCProvidersProps>) {
  let googleStatus = "Not linked";
  if (googleLinked) {
    googleStatus = googleEmail ? `Linked as ${googleEmail}` : "Linked";
  }

  return (
    <section className="space-y-2" data-testid="oidc-providers">
      <h2 className="text-sm font-semibold">Linked sign-in providers</h2>
      <div
        className="rounded-xl border border-border bg-card text-card-foreground shadow-sm px-3 py-2 text-sm"
        data-testid="oidc-provider-google-status"
      >
        <p className="font-medium">Google Workspace</p>
        <p
          className="text-muted-foreground"
          data-testid="oidc-provider-google-message"
        >
          {googleStatus}
        </p>
      </div>
    </section>
  );
}

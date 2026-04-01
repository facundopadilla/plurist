interface OIDCProvidersProps {
  googleLinked: boolean;
  googleEmail?: string;
}

export function OIDCProviders({
  googleLinked,
  googleEmail,
}: OIDCProvidersProps) {
  return (
    <section className="space-y-2" data-testid="oidc-providers">
      <h2 className="text-sm font-semibold">Linked sign-in providers</h2>
      <div
        className="elegant-card px-3 py-2 text-sm"
        data-testid="oidc-provider-google-status"
      >
        <p className="font-medium">Google Workspace</p>
        <p
          className="text-muted-foreground"
          data-testid="oidc-provider-google-message"
        >
          {googleLinked
            ? `Linked${googleEmail ? ` as ${googleEmail}` : ""}`
            : "Not linked"}
        </p>
      </div>
    </section>
  );
}

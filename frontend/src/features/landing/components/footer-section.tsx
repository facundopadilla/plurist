const PRODUCT_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
] as const;

const RESOURCES_LINKS = [
  { label: "Documentation", href: "#" },
  { label: "API Reference", href: "#" },
] as const;

const COMPANY_LINKS = [
  { label: "About", href: "#" },
  { label: "Contact", href: "#" },
] as const;

function LinkColumn({
  heading,
  links,
}: {
  heading: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
        {heading}
      </p>
      <ul className="space-y-2 flex flex-col">
        {links.map(({ label, href }) => (
          <li key={label}>
            <a
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FooterSection() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top row */}
        <div className="flex flex-col sm:flex-row justify-between gap-8">
          {/* Wordmark + tagline */}
          <div>
            <p className="text-lg font-semibold text-foreground">Plurist</p>
            <p className="text-sm text-muted-foreground mt-1">
              Content from code.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex gap-12">
            <LinkColumn heading="Product" links={PRODUCT_LINKS} />
            <LinkColumn heading="Resources" links={RESOURCES_LINKS} />
            <LinkColumn heading="Company" links={COMPANY_LINKS} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 Plurist. All rights reserved.
          </p>
          {/* Social links placeholder */}
          <div />
        </div>
      </div>
    </footer>
  );
}

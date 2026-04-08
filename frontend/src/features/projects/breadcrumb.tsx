import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ crumbs }: Readonly<{ crumbs: Crumb[] }>) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span
            key={`${crumb.to ?? crumb.label}-${i}`}
            className="flex items-center gap-1"
          >
            {i > 0 && (
              <ChevronRight
                size={13}
                className="text-muted-foreground/50 shrink-0"
              />
            )}
            {isLast || !crumb.to ? (
              <span className={isLast ? "text-foreground font-medium" : ""}>
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

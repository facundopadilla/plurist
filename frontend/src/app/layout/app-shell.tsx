import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Image,
  FileText,
  CheckSquare,
  List,
  Calendar,
  BarChart2,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useTheme } from "../use-theme";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/design-bank", label: "Design Bank", icon: Image, testId: "nav-design-bank" },
  { to: "/posts", label: "Posts", icon: FileText, testId: "nav-posts" },
  { to: "/review", label: "Review", icon: CheckSquare, testId: "nav-review" },
  { to: "/queue", label: "Queue", icon: List, testId: "nav-queue" },
  { to: "/calendar", label: "Calendar", icon: Calendar, testId: "nav-calendar" },
  { to: "/analytics", label: "Analytics", icon: BarChart2, testId: "nav-analytics" },
  { to: "/settings/integrations", label: "Settings", icon: Settings, testId: "nav-settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col" data-testid="app-sidebar">
        <div className="p-4 border-b border-border font-semibold text-sm tracking-wide uppercase">
          Socialclaw
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon, testId }) => (
            <Link
              key={to}
              to={to}
              data-testid={testId}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={toggle}
            data-testid="theme-toggle"
            aria-label="Toggle theme"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full px-3 py-2 rounded-md hover:bg-accent"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Image,
  FileText,
  List,
  Calendar,
  BarChart2,
  Settings,
  LogOut,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  Bot,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useTheme } from "../use-theme";
import { useAuth } from "../../features/auth/use-auth";
import { logoutSession } from "../../features/auth/api";

const navItems = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    testId: "nav-dashboard",
  },
  {
    to: "/projects",
    label: "Projects",
    icon: FolderKanban,
    testId: "nav-projects",
  },
  {
    to: "/design-bank",
    label: "Design Bank",
    icon: Image,
    testId: "nav-design-bank",
  },
  {
    to: "/contenido",
    label: "Contenido",
    icon: FileText,
    testId: "nav-contenido",
    metaLabel: "Revisión",
    metaTestId: "nav-revision",
  },
  { to: "/queue", label: "Queue", icon: List, testId: "nav-queue" },
  {
    to: "/calendar",
    label: "Calendar",
    icon: Calendar,
    testId: "nav-calendar",
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: BarChart2,
    testId: "nav-analytics",
  },
  {
    to: "/settings/redes-sociales",
    label: "Redes Sociales",
    icon: Settings,
    testId: "nav-settings",
  },
  {
    to: "/settings/ai-providers",
    label: "AI Providers",
    icon: Bot,
    testId: "nav-ai-providers",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const { role, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logoutSession();
      window.location.href = "/login?loggedOut=1";
    } catch (err) {
      setLogoutError(
        err instanceof Error ? err.message : "We could not sign you out.",
      );
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-3 py-3 lg:flex-row lg:gap-3">
        {/* Sidebar */}
        <aside
          data-testid="app-sidebar"
          className={cn(
            "flex flex-shrink-0 flex-col rounded-[22px] border border-border bg-card shadow-sm",
            "w-full lg:sticky lg:top-3 lg:h-[calc(100vh_-_24px)]",
            collapsed ? "lg:w-16" : "lg:w-72",
          )}
        >
          {/* Header */}
          <div className="border-b border-border px-4 py-4">
            <div
              className={cn(
                "flex items-center gap-2",
                collapsed ? "lg:justify-center" : "justify-between",
              )}
            >
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-sm font-medium text-muted-foreground">
                    Socialclaw
                  </div>
                  <div className="mt-1 truncate text-[18px] font-semibold tracking-[-0.02em]">
                    Content workspace
                  </div>
                </div>
              )}
              <button
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="elegant-button-secondary hidden shrink-0 p-2 lg:inline-flex"
              >
                {collapsed ? (
                  <PanelLeftOpen size={15} />
                ) : (
                  <PanelLeftClose size={15} />
                )}
              </button>
            </div>
            {!collapsed && (
              <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                <span className="truncate font-medium">
                  {user?.name || "Workspace user"}
                </span>
                <span className="truncate text-xs">
                  {user?.email || "Session active"}
                </span>
                <span className="text-xs">{role ?? "viewer"}</span>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            {!collapsed && (
              <div className="mb-3 px-2 text-xs font-medium text-muted-foreground">
                Navigation
              </div>
            )}
            <div className="space-y-1">
              {navItems.map(
                ({ to, label, icon: Icon, testId, metaLabel, metaTestId }) => {
                  const isActive =
                    to === "/"
                      ? location.pathname === to
                      : location.pathname.startsWith(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      data-testid={testId}
                      title={collapsed ? label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center rounded-[14px] border py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        collapsed
                          ? "lg:justify-center lg:px-0 px-3 gap-3"
                          : "gap-3 px-3",
                        isActive
                          ? "border-primary/10 bg-primary text-primary-foreground shadow-sm"
                          : "border-transparent text-foreground hover:border-border hover:bg-accent",
                      )}
                    >
                      <Icon size={16} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{label}</div>
                          </div>
                          {metaLabel ? (
                            <span
                              data-testid={metaTestId}
                              className={cn(
                                "shrink-0 text-[11px]",
                                isActive
                                  ? "text-primary-foreground/75"
                                  : "text-muted-foreground",
                              )}
                            >
                              {metaLabel}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>
                  );
                },
              )}
            </div>
          </nav>

          {/* Footer */}
          <div
            className={cn(
              "border-t border-border py-3",
              collapsed ? "lg:px-2 px-3" : "px-3",
            )}
          >
            {logoutError && !collapsed ? (
              <p className="mb-2 text-xs text-red-600">{logoutError}</p>
            ) : null}
            <div
              className={cn("grid gap-2", collapsed && "lg:place-items-center")}
            >
              {collapsed ? (
                <>
                  <button
                    onClick={() => void handleLogout()}
                    data-testid="logout-button"
                    aria-label="Sign out"
                    title="Sign out"
                    className="elegant-button-secondary w-full justify-between disabled:opacity-60 lg:w-auto lg:p-2 lg:justify-center"
                    disabled={isLoggingOut}
                  >
                    <span className="lg:hidden">
                      {isLoggingOut ? "Signing out..." : "Sign out"}
                    </span>
                    <LogOut size={15} />
                  </button>
                  <button
                    onClick={toggle}
                    data-testid="theme-toggle"
                    aria-label="Toggle theme"
                    title={theme === "dark" ? "Light mode" : "Dark mode"}
                    className="elegant-button-secondary w-full justify-between lg:w-auto lg:p-2 lg:justify-center"
                  >
                    <span className="lg:hidden">
                      {theme === "dark" ? "Light mode" : "Dark mode"}
                    </span>
                    {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => void handleLogout()}
                    data-testid="logout-button"
                    aria-label="Sign out"
                    className="elegant-button-secondary w-full justify-between disabled:opacity-60"
                    disabled={isLoggingOut}
                  >
                    <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
                    <LogOut size={15} />
                  </button>
                  <button
                    onClick={toggle}
                    data-testid="theme-toggle"
                    aria-label="Toggle theme"
                    className="elegant-button-secondary w-full justify-between"
                  >
                    <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                    {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-h-[calc(100vh_-_24px)] flex-1 overflow-auto rounded-[22px] border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  Workspace
                </div>
                <div className="mt-1.5 text-[24px] font-semibold tracking-[-0.03em]">
                  {navItems.find(({ to }) =>
                    to === "/"
                      ? location.pathname === to
                      : location.pathname.startsWith(to),
                  )?.label ?? "Overview"}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {user?.email ?? "Session active"}
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

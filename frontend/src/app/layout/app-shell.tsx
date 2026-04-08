import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Image,
  FileText,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Bot,
  Code2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../features/auth/use-auth";
import { logoutSession } from "../../features/auth/api";

const navItems = [
  {
    to: "/dashboard",
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
    to: "/content",
    label: "Content",
    icon: FileText,
    testId: "nav-content",
  },
  {
    to: "/settings/ai-providers",
    label: "AI Providers",
    icon: Bot,
    testId: "nav-ai-providers",
  },
];

export function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const location = useLocation();
  const { role, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logoutSession();
      globalThis.location.href = "/login?loggedOut=1";
    } catch (err) {
      setLogoutError(
        err instanceof Error ? err.message : "We could not sign you out.",
      );
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      className="dark relative min-h-screen bg-[#09090b] text-zinc-50"
      style={{ colorScheme: "dark" }}
    >
      {/* Dot grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #fafafa 0.6px, transparent 0.6px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[20%] h-[500px] w-[500px] rounded-full bg-zinc-500/[0.04] blur-[160px]" />
        <div className="absolute bottom-[10%] right-[5%] h-[400px] w-[400px] rounded-full bg-zinc-500/[0.03] blur-[140px]" />
      </div>

      {/* Main layout */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-3 py-3 lg:flex-row lg:gap-3">
        {/* Sidebar */}
        <aside
          data-testid="app-sidebar"
          className={cn(
            "flex flex-shrink-0 flex-col rounded-2xl border border-zinc-800/50 bg-zinc-900/30 backdrop-blur-xl",
            "w-full lg:sticky lg:top-3 lg:h-[calc(100vh_-_24px)]",
            collapsed ? "lg:w-16" : "lg:w-72",
          )}
        >
          {/* Header */}
          <div className="border-b border-zinc-800/40 px-4 py-4">
            <div
              className={cn(
                "flex items-center gap-2.5",
                collapsed ? "lg:justify-center" : "justify-between",
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-900">
                  <Code2 size={13} strokeWidth={2.5} />
                </div>
                {!collapsed && (
                  <span className="text-[13px] font-semibold tracking-[-0.01em] text-zinc-50">
                    Plurist
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden shrink-0 border-zinc-800/50 bg-transparent text-zinc-300 hover:bg-white/[0.05] hover:text-zinc-50 lg:inline-flex"
              >
                {collapsed ? (
                  <PanelLeftOpen size={15} />
                ) : (
                  <PanelLeftClose size={15} />
                )}
              </Button>
            </div>
            {!collapsed && (
              <div className="mt-3 grid gap-1">
                <span className="truncate text-sm font-medium text-zinc-200">
                  {user?.name ?? "Workspace user"}
                </span>
                <span className="truncate text-xs text-zinc-400">
                  {user?.email ?? "Session active"}
                </span>
                <span className="text-xs text-zinc-500">
                  {role ?? "viewer"}
                </span>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-1">
              {navItems.map(({ to, label, icon: Icon, testId }) => {
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
                      "flex items-center rounded-xl py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]",
                      collapsed
                        ? "justify-center px-0 gap-3 lg:justify-center lg:px-0"
                        : "gap-3 px-3",
                      isActive
                        ? "bg-white/[0.08] text-zinc-50"
                        : "text-zinc-300 hover:bg-white/[0.05] hover:text-zinc-50",
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && (
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em]">
                        {label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div
            className={cn(
              "border-t border-zinc-800/40 py-3",
              collapsed ? "px-3 lg:px-2" : "px-3",
            )}
          >
            {logoutError && !collapsed ? (
              <p className="mb-2 text-xs text-red-400">{logoutError}</p>
            ) : null}
            <div
              className={cn("grid gap-2", collapsed && "lg:place-items-center")}
            >
              <Button
                variant="outline"
                onClick={() => void handleLogout()}
                data-testid="logout-button"
                aria-label="Sign out"
                title={collapsed ? "Sign out" : undefined}
                className={cn(
                  "border-zinc-800/50 bg-transparent text-zinc-300 hover:bg-white/[0.05] hover:text-zinc-50 disabled:opacity-60",
                  collapsed
                    ? "w-full justify-between lg:w-auto lg:justify-center lg:p-2"
                    : "w-full justify-between",
                )}
                disabled={isLoggingOut}
              >
                <span className={cn(collapsed && "lg:hidden")}>
                  {isLoggingOut ? "Signing out..." : "Sign out"}
                </span>
                <LogOut size={15} />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="relative min-h-[calc(100vh_-_24px)] flex-1 overflow-auto">
          <div className="p-5 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AppShell } from "./layout/app-shell";
import { AuthShell } from "./layout/auth-shell";
import { LoginPage } from "../features/auth/login-page";
import { InviteAcceptPage } from "../features/auth/invite-accept-page";
import { RequireAuth } from "../features/auth/require-auth";
import { DashboardPage } from "../features/dashboard/dashboard-page";
import { DesignBankPage } from "../features/design-bank/design-bank-page";
import { ProjectsListPage } from "../features/projects/projects-list-page";
import { ProjectDetailPage } from "../features/projects/project-detail-page";
import { ReviewPage } from "../features/content/review-page";
import { QueuePage } from "../features/scheduler/queue-page";
import { CalendarPage } from "../features/scheduler/calendar-page";
import { AnalyticsPage } from "../features/analytics/analytics-page";
import { SettingsIntegrationsPage } from "../features/integrations/settings-integrations-page";
import { RedesSocialesPage } from "../features/integrations/redes-sociales-page";
import { AIProvidersPage } from "../features/settings/ai-providers/ai-providers-page";

// Landing — public, code-split
const LandingPage = lazy(() =>
  import("../features/landing/landing-page").then((m) => ({
    default: m.LandingPage,
  })),
);

// Canvas Compose — full-screen, code-split, no AppShell wrapper
const CanvasComposePage = lazy(() =>
  import("../features/canvas/canvas-compose-page").then((m) => ({
    default: m.CanvasComposePage,
  })),
);

const CanvasComposeFallback = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-background">
    <span className="text-muted-foreground text-sm">
      Cargando Canvas Studio...
    </span>
  </div>
);

const NotFound = () => (
  <div className="flex flex-col items-center justify-center h-full gap-4">
    <h1 className="text-4xl font-bold">404 — Page Not Found</h1>
    <p className="text-muted-foreground">
      The page you&apos;re looking for doesn&apos;t exist.
    </p>
  </div>
);

export function AppRouter() {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/login"
          element={
            <AuthShell>
              <LoginPage />
            </AuthShell>
          }
        />
        <Route
          path="/invite/:token"
          element={
            <AuthShell>
              <InviteAcceptPage />
            </AuthShell>
          }
        />
        <Route
          path="/"
          element={
            <Suspense
              fallback={
                <div className="flex h-screen w-screen items-center justify-center bg-background">
                  <span className="text-muted-foreground text-sm">
                    Loading...
                  </span>
                </div>
              }
            >
              <LandingPage />
            </Suspense>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <AppShell>
                <DashboardPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/design-bank"
          element={
            <RequireAuth>
              <AppShell>
                <DesignBankPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/projects"
          element={
            <RequireAuth>
              <AppShell>
                <ProjectsListPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <RequireAuth>
              <AppShell>
                <ProjectDetailPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/contenido"
          element={
            <RequireAuth>
              <AppShell>
                <ReviewPage />
              </AppShell>
            </RequireAuth>
          }
        />
        {/* Backward-compatible redirect: /posts → /contenido */}
        <Route path="/posts" element={<Navigate to="/contenido" replace />} />
        <Route
          path="/compose"
          element={
            <RequireAuth>
              <Suspense fallback={<CanvasComposeFallback />}>
                <CanvasComposePage />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/queue"
          element={
            <RequireAuth>
              <AppShell>
                <QueuePage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/calendar"
          element={
            <RequireAuth>
              <AppShell>
                <CalendarPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/analytics"
          element={
            <RequireAuth>
              <AppShell>
                <AnalyticsPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/settings/integrations"
          element={
            <RequireAuth>
              <AppShell>
                <SettingsIntegrationsPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/settings/redes-sociales"
          element={
            <RequireAuth>
              <AppShell>
                <RedesSocialesPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/settings/ai-providers"
          element={
            <RequireAuth>
              <AppShell>
                <AIProvidersPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="*"
          element={
            <RequireAuth>
              <AppShell>
                <NotFound />
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

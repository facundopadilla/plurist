import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./layout/app-shell";
import { AuthShell } from "./layout/auth-shell";
import { LoginPage } from "../features/auth/login-page";
import { InviteAcceptPage } from "../features/auth/invite-accept-page";
import { RequireAuth } from "../features/auth/require-auth";
import { DesignBankPage } from "../features/design-bank/design-bank-page";

const Dashboard = () => (
  <div>
    <h1 className="text-2xl font-semibold">Dashboard</h1>
    <p className="text-muted-foreground mt-2">Coming soon.</p>
  </div>
);

const Posts = () => (
  <div>
    <h1 className="text-2xl font-semibold">Posts</h1>
    <p className="text-muted-foreground mt-2">Coming soon.</p>
  </div>
);

const Review = () => (
  <div>
    <h1 className="text-2xl font-semibold">Review</h1>
    <p className="text-muted-foreground mt-2">Coming soon.</p>
  </div>
);

const Queue = () => (
  <div>
    <h1 className="text-2xl font-semibold">Queue</h1>
    <p className="text-muted-foreground mt-2">Coming soon.</p>
  </div>
);

const CalendarPage = () => (
  <div>
    <h1 className="text-2xl font-semibold">Calendar</h1>
    <p className="text-muted-foreground mt-2">Coming soon.</p>
  </div>
);

const Analytics = () => (
  <div>
    <h1 className="text-2xl font-semibold">Analytics</h1>
    <p className="text-muted-foreground mt-2">Coming soon.</p>
  </div>
);

const SettingsIntegrations = () => (
  <div>
    <h1 className="text-2xl font-semibold">Settings — Integrations</h1>
    <p className="text-muted-foreground mt-2">Coming soon.</p>
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
    <BrowserRouter>
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
            <RequireAuth>
              <AppShell>
                <Dashboard />
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
          path="/posts"
          element={
            <RequireAuth>
              <AppShell>
                <Posts />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/review"
          element={
            <RequireAuth>
              <AppShell>
                <Review />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/queue"
          element={
            <RequireAuth>
              <AppShell>
                <Queue />
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
                <Analytics />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/settings/integrations"
          element={
            <RequireAuth>
              <AppShell>
                <SettingsIntegrations />
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

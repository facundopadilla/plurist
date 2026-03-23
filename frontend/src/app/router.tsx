import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./layout/app-shell";
import { AuthShell } from "./layout/auth-shell";

const Dashboard = () => (
  <div>
    <h1 className="text-2xl font-semibold">Dashboard</h1>
    <p className="text-muted-foreground mt-2">Coming soon.</p>
  </div>
);

const DesignBank = () => (
  <div>
    <h1 className="text-2xl font-semibold">Design Bank</h1>
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

const Login = () => (
  <div data-testid="login-page">
    <h1 className="text-xl font-semibold text-center">Login</h1>
    <p className="text-muted-foreground mt-2 text-center">Coming soon.</p>
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
              <Login />
            </AuthShell>
          }
        />
        <Route
          path="/"
          element={
            <AppShell>
              <Dashboard />
            </AppShell>
          }
        />
        <Route
          path="/design-bank"
          element={
            <AppShell>
              <DesignBank />
            </AppShell>
          }
        />
        <Route
          path="/posts"
          element={
            <AppShell>
              <Posts />
            </AppShell>
          }
        />
        <Route
          path="/review"
          element={
            <AppShell>
              <Review />
            </AppShell>
          }
        />
        <Route
          path="/queue"
          element={
            <AppShell>
              <Queue />
            </AppShell>
          }
        />
        <Route
          path="/calendar"
          element={
            <AppShell>
              <CalendarPage />
            </AppShell>
          }
        />
        <Route
          path="/analytics"
          element={
            <AppShell>
              <Analytics />
            </AppShell>
          }
        />
        <Route
          path="/settings/integrations"
          element={
            <AppShell>
              <SettingsIntegrations />
            </AppShell>
          }
        />
        <Route
          path="*"
          element={
            <AppShell>
              <NotFound />
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

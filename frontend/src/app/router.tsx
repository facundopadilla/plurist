import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { AppShell } from "./layout/app-shell";

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-2">Coming soon.</p>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found.</p>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Placeholder title="Dashboard" /> },
      { path: "design-bank", element: <Placeholder title="Design Bank" /> },
      { path: "posts", element: <Placeholder title="Posts" /> },
      { path: "review", element: <Placeholder title="Review" /> },
      { path: "queue", element: <Placeholder title="Queue" /> },
      { path: "calendar", element: <Placeholder title="Calendar" /> },
      { path: "analytics", element: <Placeholder title="Analytics" /> },
      { path: "settings/integrations", element: <Placeholder title="Settings — Integrations" /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}

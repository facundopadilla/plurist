import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./use-auth";

export function RequireAuth({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, isLoading, error, refresh } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground px-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 space-y-3 text-center">
          <h1 className="text-lg font-semibold">
            We couldn&apos;t verify your session
          </h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

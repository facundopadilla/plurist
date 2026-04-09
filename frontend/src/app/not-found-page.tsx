import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../features/auth/use-auth";

/** Time until automatic redirect (ms). */
export const NOT_FOUND_REDIRECT_MS = 10_000;

/**
 * Full-screen 404 — never rendered inside AppShell so the app chrome is not
 * exposed on unknown URLs. Redirects to `/` when logged out or `/dashboard`
 * when logged in after NOT_FOUND_REDIRECT_MS with a draining progress bar.
 */
export function NotFoundPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [progress, setProgress] = useState(1);
  const doneRef = useRef(false);

  const destination = user != null ? "/dashboard" : "/";

  useEffect(() => {
    if (isLoading) return;

    doneRef.current = false;
    const start = Date.now();
    let raf = 0;

    const tick = () => {
      if (doneRef.current) return;
      const elapsed = Date.now() - start;
      const p = Math.max(0, 1 - elapsed / NOT_FOUND_REDIRECT_MS);
      setProgress(p);
      if (p <= 0) {
        doneRef.current = true;
        navigate(destination, { replace: true });
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      doneRef.current = true;
      cancelAnimationFrame(raf);
    };
  }, [isLoading, destination, navigate]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#09090b] text-zinc-400"
        data-testid="not-found-page-loading"
      >
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  const secondsLeft = Math.ceil(progress * (NOT_FOUND_REDIRECT_MS / 1000));

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#09090b] px-6 text-zinc-50"
      data-testid="not-found-page"
    >
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          404 — Page not found
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          This URL isn&apos;t part of the app. You&apos;ll be redirected to{" "}
          {user != null ? "your dashboard" : "the home page"} automatically.
        </p>
      </div>

      <div className="w-full max-w-md space-y-2">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-zinc-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={NOT_FOUND_REDIRECT_MS}
          aria-valuenow={Math.round((1 - progress) * NOT_FOUND_REDIRECT_MS)}
          aria-label="Time until redirect"
          data-testid="not-found-redirect-progress"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-fuchsia-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="text-center font-mono text-xs text-zinc-500">
          Redirecting in {secondsLeft}s…
        </p>
      </div>
    </div>
  );
}

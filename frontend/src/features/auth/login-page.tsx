import { useState, type BaseSyntheticEvent } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, LogOut } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { loginWithPassword } from "./api";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inviteAccepted = searchParams.get("inviteAccepted") === "1";
  const loggedOut = searchParams.get("loggedOut") === "1";

  const onSubmit = (event: BaseSyntheticEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    void (async () => {
      try {
        await loginWithPassword(email, password);
        globalThis.location.href = "/dashboard";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <form className="space-y-6" data-testid="login-form" onSubmit={onSubmit}>
      <div className="space-y-2 text-center">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-zinc-50">
          Sign in
        </h1>
        <p className="text-[14px] text-zinc-300">
          Enter your credentials to continue.
        </p>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {inviteAccepted && (
          <Alert variant="success">
            <CheckCircle2 size={14} />
            <AlertDescription>
              Account created. Sign in to continue.
            </AlertDescription>
          </Alert>
        )}
        {loggedOut && (
          <Alert variant="success">
            <LogOut size={14} />
            <AlertDescription>You have been signed out.</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <CircleAlert size={14} />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <label className="block space-y-2" htmlFor="login-email">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-300">
            Email
          </span>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email"
            className="flex h-11 w-full rounded-xl border border-zinc-700/40 bg-zinc-900/40 px-4 text-[14px] text-zinc-50 outline-none transition-all placeholder:text-zinc-500 focus:border-zinc-500/60 focus:ring-2 focus:ring-white/[0.06]"
            placeholder="name@company.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="block space-y-2" htmlFor="login-password">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-300">
            Password
          </span>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="login-password"
            className="flex h-11 w-full rounded-xl border border-zinc-700/40 bg-zinc-900/40 px-4 text-[14px] text-zinc-50 outline-none transition-all placeholder:text-zinc-500 focus:border-zinc-500/60 focus:ring-2 focus:ring-white/[0.06]"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-1">
        <button
          type="submit"
          data-testid="login-submit"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-50 text-[14px] font-semibold text-zinc-900 transition-all duration-200 hover:bg-white hover:shadow-[0_0_20px_rgba(250,250,250,0.12)] disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
          {!isSubmitting && <ArrowRight size={14} />}
        </button>

        <a
          href="/api/v1/auth/google/start"
          data-testid="login-google"
          className="flex h-11 w-full items-center justify-center rounded-xl border border-zinc-700/40 bg-transparent text-[14px] font-medium text-zinc-200 transition-all duration-200 hover:border-zinc-600/50 hover:bg-zinc-800/30 hover:text-zinc-50"
        >
          Continue with Google
        </a>
      </div>

      <p className="text-center text-[12px] text-zinc-400">
        Need access? Ask the workspace owner for an invite.
      </p>
    </form>
  );
}

import { FormEvent, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  LogOut,
  Mail,
  LockKeyhole,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { loginWithPassword } from "./api";
import { StatusMessage } from "../../components/ui/status-message";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inviteAccepted = searchParams.get("inviteAccepted") === "1";
  const loggedOut = searchParams.get("loggedOut") === "1";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithPassword(email, password);
      // Full page reload so AuthContext re-initialises with the live session cookie.
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="animate-page-in space-y-6"
      data-testid="login-form"
      onSubmit={onSubmit}
    >
      <div className="space-y-4 border-b border-border pb-5">
        <div className="font-elegant-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Workspace sign-in
        </div>
        <div className="space-y-2">
          <h1 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground">
            Welcome back
          </h1>
          <p className="text-[16px] leading-7 text-muted-foreground">
            Use your workspace account to continue into projects, approvals, and
            publishing.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {inviteAccepted ? (
          <StatusMessage
            icon={CheckCircle2}
            tone="success"
            message="Account created. Sign in to continue."
          />
        ) : null}
        {loggedOut ? (
          <StatusMessage
            icon={LogOut}
            tone="success"
            message="You have been signed out."
          />
        ) : null}
        {error ? (
          <StatusMessage icon={CircleAlert} tone="error" message={error} />
        ) : null}
      </div>

      <div className="space-y-4">
        <label className="block space-y-2" htmlFor="login-email">
          <span className="font-elegant-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            Email
          </span>
          <span className="flex items-center gap-3 rounded-[14px] border border-input bg-background px-3 py-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
            <Mail size={16} className="text-muted-foreground" />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              data-testid="login-email"
              className="w-full bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="name@workspace.com"
              autoComplete="email"
              required
            />
          </span>
        </label>

        <label className="block space-y-2" htmlFor="login-password">
          <span className="font-elegant-mono text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            Password
          </span>
          <span className="flex items-center gap-3 rounded-[14px] border border-input bg-background px-3 py-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
            <LockKeyhole size={16} className="text-muted-foreground" />
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              data-testid="login-password"
              className="w-full bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </span>
        </label>
      </div>

      <div className="space-y-3 pt-2">
        <button
          type="submit"
          data-testid="login-submit"
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-3 py-3 text-[16px] font-medium text-primary-foreground transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={isSubmitting}
        >
          <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
          {!isSubmitting ? <ArrowRight size={16} /> : null}
        </button>

        <a
          href="/api/v1/auth/google/start"
          data-testid="login-google"
          className="flex w-full items-center justify-center rounded-[14px] border border-input bg-background px-3 py-3 text-[16px] font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Continue with Google
        </a>
      </div>

      <div className="font-elegant-mono border-t border-border pt-4 text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
        Need an invite first? Ask the workspace owner.
      </div>
    </form>
  );
}

import { FormEvent, useState } from "react";
import { loginWithPassword } from "./api";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <form className="space-y-4" data-testid="login-form" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold text-center">Login</h1>
      <div className="space-y-1">
        <label htmlFor="login-email" className="text-sm text-muted-foreground">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          data-testid="login-email"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="login-password" className="text-sm text-muted-foreground">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          data-testid="login-password"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <button
        type="submit"
        data-testid="login-submit"
        className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { acceptInvite } from "./api";

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      setError("Missing invite token");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await acceptInvite(token, name, password, confirmPassword);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit} data-testid="invite-accept-form">
      <h1 className="text-xl font-semibold text-center">Accept invite</h1>
      <div className="space-y-1">
        <label htmlFor="invite-name" className="text-sm text-muted-foreground">
          Name
        </label>
        <input
          id="invite-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="invite-password" className="text-sm text-muted-foreground">
          Password
        </label>
        <input
          id="invite-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="invite-confirm-password" className="text-sm text-muted-foreground">
          Confirm password
        </label>
        <input
          id="invite-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <button
        type="submit"
        className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account..." : "Accept invite"}
      </button>
    </form>
  );
}

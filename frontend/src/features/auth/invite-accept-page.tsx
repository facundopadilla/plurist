import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      navigate("/login?inviteAccepted=1", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={onSubmit}
      data-testid="invite-accept-form"
    >
      <h1 className="text-xl font-semibold text-center">Accept invite</h1>
      <div className="space-y-1">
        <Label htmlFor="invite-name">Name</Label>
        <Input
          id="invite-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-password">Password</Label>
        <Input
          id="invite-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invite-confirm-password">Confirm password</Label>
        <Input
          id="invite-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="submit"
        className="w-full justify-center"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account..." : "Accept invite"}
      </Button>
    </form>
  );
}

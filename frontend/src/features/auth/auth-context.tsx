import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchMe, fetchMeSilent } from "./api";
import { setCsrfToken } from "./csrf";
import type { AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  role: AuthUser["role"];
  isOwner: boolean;
  isEditor: boolean;
  isPublisher: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Backend may include a csrf_token in the /me response for convenience.
interface MeResponse extends AuthUser {
  csrf_token?: string;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  isOwner: false,
  isEditor: false,
  isPublisher: false,
  isLoading: true,
  error: null,
  refresh: async () => {},
});

export { AuthContext };

export function AuthProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Ref avoids stale-closure issues across renders. Flips to true after the
  // first probe so subsequent manual refreshes use the full fetchMe path.
  const initialDoneRef = useRef(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // Initial page-load probe uses the silent variant so a pre-login 401
      // from /api/v1/auth/me does not appear as a console error in DevTools.
      // Once the first probe completes, all subsequent calls (e.g. after login)
      // use fetchMe so real auth errors stay visible.
      const me: MeResponse | null = initialDoneRef.current
        ? ((await fetchMe()) as MeResponse)
        : await fetchMeSilent();

      if (me?.csrf_token) {
        setCsrfToken(me.csrf_token);
      }
      setUser(me ?? null);
      setError(null);
    } catch (err) {
      setUser(null);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("We could not verify your session. Please try again.");
      }
    } finally {
      setIsLoading(false);
      initialDoneRef.current = true;
    }
  }, []);

  useEffect(() => {
    const path = globalThis.location.pathname;
    const isPublicAuthPath =
      path === "/" || path === "/login" || path.startsWith("/invite/");

    if (isPublicAuthPath) {
      initialDoneRef.current = true;
      setIsLoading(false);
      return;
    }

    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => {
    const role = user?.role ?? null;
    return {
      user,
      role,
      isOwner: role === "owner",
      isEditor: role === "editor",
      isPublisher: role === "publisher",
      isLoading,
      error,
      refresh,
    };
  }, [user, isLoading, error, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

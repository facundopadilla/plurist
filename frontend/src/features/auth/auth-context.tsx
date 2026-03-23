import { createContext, useEffect, useMemo, useState } from "react";
import { fetchMe } from "./api";
import { setCsrfToken } from "./csrf";
import type { AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  role: AuthUser["role"];
  isOwner: boolean;
  isEditor: boolean;
  isPublisher: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

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
  refresh: async () => {},
});

export { AuthContext };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = (await fetchMe()) as MeResponse;
      if (me.csrf_token) {
        setCsrfToken(me.csrf_token);
      }
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = user?.role ?? null;
    return {
      user,
      role,
      isOwner: role === "owner",
      isEditor: role === "editor",
      isPublisher: role === "publisher",
      isLoading,
      refresh,
    };
  }, [user, isLoading]);

   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
 }


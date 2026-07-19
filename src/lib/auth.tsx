"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isOwnerEmail } from "./access";
import type { MembershipTier, User } from "./types";

const AGE_KEY = "kohar_age_ok";

type AuthContextValue = {
  ready: boolean;
  ageVerified: boolean;
  user: User | null;
  isOwner: boolean;
  verifyAge: () => void;
  /** Create account with email + password (server-backed). */
  signup: (
    email: string,
    displayName: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Log in with email + password. */
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  /** Owner-only tier switch (server). */
  setTier: (tier: MembershipTier) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toUser(raw: {
  id: string;
  email: string;
  displayName: string;
  tier: MembershipTier;
  ageVerified: boolean;
  createdAt?: string;
}): User {
  return {
    id: raw.id,
    email: raw.email,
    displayName: raw.displayName,
    tier: isOwnerEmail(raw.email) ? "vip" : raw.tier,
    ageVerified: raw.ageVerified,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        user?: {
          id: string;
          email: string;
          displayName: string;
          tier: MembershipTier;
          ageVerified: boolean;
          createdAt?: string;
        } | null;
      };
      if (data.user) {
        const u = toUser(data.user);
        setUser(u);
        if (u.ageVerified) {
          localStorage.setItem(AGE_KEY, "1");
          setAgeVerified(true);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setAgeVerified(localStorage.getItem(AGE_KEY) === "1");
    void (async () => {
      await refreshUser();
      setReady(true);
    })();
  }, [refreshUser]);

  const verifyAge = useCallback(() => {
    localStorage.setItem(AGE_KEY, "1");
    setAgeVerified(true);
  }, []);

  const signup = useCallback(
    async (email: string, displayName: string, password: string) => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            displayName,
            password,
            ageConfirmed: true,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          user?: {
            id: string;
            email: string;
            displayName: string;
            tier: MembershipTier;
            ageVerified: boolean;
            createdAt?: string;
          };
        };
        if (!res.ok || !data.user) {
          return {
            ok: false as const,
            error: data.error || "Could not create account.",
          };
        }
        localStorage.setItem(AGE_KEY, "1");
        setAgeVerified(true);
        setUser(toUser(data.user));
        return { ok: true as const };
      } catch {
        return {
          ok: false as const,
          error: "Network error. Please try again.",
        };
      }
    },
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        user?: {
          id: string;
          email: string;
          displayName: string;
          tier: MembershipTier;
          ageVerified: boolean;
          createdAt?: string;
        };
      };
      if (!res.ok || !data.user) {
        return {
          ok: false as const,
          error: data.error || "Invalid email or password.",
        };
      }
      localStorage.setItem(AGE_KEY, "1");
      setAgeVerified(true);
      setUser(toUser(data.user));
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        error: "Network error. Please try again.",
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  const setTier = useCallback(
    async (tier: MembershipTier) => {
      if (!user) return;
      try {
        const res = await fetch("/api/auth/tier", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          user?: {
            id: string;
            email: string;
            displayName: string;
            tier: MembershipTier;
            ageVerified: boolean;
            createdAt?: string;
          };
        };
        if (res.ok && data.user) {
          setUser(toUser(data.user));
        }
      } catch {
        /* ignore */
      }
    },
    [user],
  );

  const isOwner = !!(user && isOwnerEmail(user.email));

  const value = useMemo(
    () => ({
      ready,
      ageVerified,
      user,
      isOwner,
      verifyAge,
      signup,
      login,
      logout,
      setTier,
      refreshUser,
    }),
    [
      ready,
      ageVerified,
      user,
      isOwner,
      verifyAge,
      signup,
      login,
      logout,
      setTier,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
